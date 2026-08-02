import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { FinancialOperationType, Prisma } from '@prisma/client';
import { MachineService } from '../machine/machine.service';
import type { MachineTier } from '../machine/machine.service';

export interface UserMiningState {
  telegramUserId: string;
  activeCurrency: 'USDT' | 'TON';
  baseSpeedGhs: number;
  coolerMultiplier: number;
  unclaimedBalance: number;
  lastTappedAt?: Date;
  lastUpdatedAt?: Date;
  machineMode: string;
  lifetimePromotionalOutput: number;
  interactivePromotionalOutput: number;
  // Computed on every read — rendered by the UI but never persisted
  isOverheated: boolean;
  cooldownRemaining: number;
  tapYieldPerTap: number;
}

const MAX_MULTIPLIER = 20.2;
const MULTIPLIER_DECAY_PER_SEC = 0.5;
const OVERHEAT_MS = 15 * 1000;

@Injectable()
export class MiningService {
  // In-memory store for user mining sessions (acts as a Redis fallback)
  private readonly sessions = new Map<string, UserMiningState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: FinancialOrchestratorService,
    @Inject(forwardRef(() => MachineService))
    private readonly machineService: MachineService,
  ) {}

  private async loadFromDb(telegramUserId: string): Promise<UserMiningState | null> {
    try {
      const record = await this.prisma.userMiningState.findUnique({
        where: { telegramUserId: BigInt(telegramUserId) },
      });
      if (!record) return null;
      return {
        telegramUserId,
        activeCurrency: record.activeCurrency as 'USDT' | 'TON',
        baseSpeedGhs: record.baseSpeedGhs.toNumber(),
        coolerMultiplier: record.coolerMultiplier.toNumber(),
        unclaimedBalance: record.unclaimedBalance.toNumber(),
        lastTappedAt: record.lastTappedAt ? new Date(record.lastTappedAt) : undefined,
        lastUpdatedAt: record.lastUpdatedAt ? new Date(record.lastUpdatedAt) : undefined,
        machineMode: record.machineMode,
        lifetimePromotionalOutput: record.lifetimePromotionalOutput.toNumber(),
        interactivePromotionalOutput: record.interactivePromotionalOutput.toNumber(),
        isOverheated: false,
        cooldownRemaining: 0,
        tapYieldPerTap: 0,
      };
    } catch (err) {
      console.warn('Failed to load mining state from DB:', err);
      return null;
    }
  }

  /**
   * Persist the session, propagating failures to the caller. Used inside
   * claim's transaction so a failed write rolls the whole claim back.
   */
  private async persistSession(session: UserMiningState, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<void> {
    await client.userMiningState.upsert({
      where: { telegramUserId: BigInt(session.telegramUserId) },
      create: {
        telegramUserId: BigInt(session.telegramUserId),
        activeCurrency: session.activeCurrency,
        baseSpeedGhs: session.baseSpeedGhs,
        coolerMultiplier: session.coolerMultiplier,
        unclaimedBalance: session.unclaimedBalance,
        lastTappedAt: session.lastTappedAt,
        lastUpdatedAt: session.lastUpdatedAt,
        machineMode: session.machineMode,
        lifetimePromotionalOutput: session.lifetimePromotionalOutput,
        interactivePromotionalOutput: session.interactivePromotionalOutput,
      },
      update: {
        activeCurrency: session.activeCurrency,
        baseSpeedGhs: session.baseSpeedGhs,
        coolerMultiplier: session.coolerMultiplier,
        unclaimedBalance: session.unclaimedBalance,
        lastTappedAt: session.lastTappedAt,
        lastUpdatedAt: session.lastUpdatedAt,
        machineMode: session.machineMode,
        lifetimePromotionalOutput: session.lifetimePromotionalOutput,
        interactivePromotionalOutput: session.interactivePromotionalOutput,
      },
    });
  }

  private async saveToDb(session: UserMiningState): Promise<void> {
    try {
      await this.persistSession(session);
    } catch (err) {
      console.warn('Failed to save mining state to DB:', err);
    }
  }

  /**
   * Highest-capacity active machine tier — the economic profile that governs
   * tap yield, thermal limits, and promotional economics for the session.
   */
  private async getBestActiveTier(session: UserMiningState): Promise<MachineTier | undefined> {
    const machines = await this.machineService.getUserMachines(session.telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
    const catalog = this.machineService.getCatalog();

    let bestTier: MachineTier | undefined;
    for (const um of activeMachines) {
      const tier = catalog.find((t) => t.tierCode === um.tierCode);
      if (!tier) continue;
      if (!bestTier || tier.capacityGhs > bestTier.capacityGhs) bestTier = tier;
    }
    return bestTier;
  }

  /**
   * Derive the thermal state of the machine. The overheat window opens when the
   * cooler multiplier reaches its cap and closes 15s after the last tap. While
   * overheated the multiplier is frozen and the engine pauses; when the window
   * closes the core resets to 1.0 so tapping can resume cleanly.
   */
  private async applyCoolingState(session: UserMiningState, now: Date): Promise<void> {
    const bestTier = await this.getBestActiveTier(session);
    const maxMultiplier = bestTier?.maxMultiplier ?? MAX_MULTIPLIER;
    const lastTap = session.lastTappedAt ? new Date(session.lastTappedAt).getTime() : 0;
    const overheated = session.coolerMultiplier >= maxMultiplier && now.getTime() - lastTap < OVERHEAT_MS;
    if (overheated) {
      session.isOverheated = true;
      session.cooldownRemaining = Math.max(0, Math.ceil((OVERHEAT_MS - (now.getTime() - lastTap)) / 1000));
      return;
    }
    session.isOverheated = false;
    session.cooldownRemaining = 0;
    if (session.coolerMultiplier >= maxMultiplier) {
      session.coolerMultiplier = 1.0; // cooldown finished — core resets
    }
  }

  /**
   * Server-computed per-tap yield from the machine configuration. The client
   * never supplies yield numbers — it only renders this value.
   */
  private async computeTapYield(session: UserMiningState): Promise<number> {
    const bestTier = await this.getBestActiveTier(session);

    const dailyYield = bestTier?.dailyYieldEstimateUsdt ?? 2.0;
    const payout = session.activeCurrency === 'TON' ? dailyYield * 1.15 : dailyYield;
    const interactiveRate = bestTier?.interactiveBaseRate ?? 0.01;
    let yieldValue = interactiveRate * session.coolerMultiplier * payout;

    if (bestTier?.promoOutputCap && session.machineMode === 'PROMOTIONAL') {
      const remainingPromoCap = Math.max(0, bestTier.promoOutputCap - session.lifetimePromotionalOutput);
      const interactiveCap = bestTier.interactiveBonusCap ?? Number.MAX_SAFE_INTEGER;
      const remainingInteractive = Math.max(0, interactiveCap - session.interactivePromotionalOutput);
      yieldValue = Math.min(yieldValue, remainingPromoCap, remainingInteractive);
    }

    return yieldValue;
  }

  private async accruePassiveYield(session: UserMiningState): Promise<void> {
    const now = new Date();
    const lastUpdate = session.lastUpdatedAt ? new Date(session.lastUpdatedAt) : new Date();
    session.lastUpdatedAt = now;

    const elapsedMs = now.getTime() - lastUpdate.getTime();
    await this.applyCoolingState(session, now);
    if (elapsedMs <= 0) return;

    if (session.isOverheated) {
      return;
    }

    const bestTier = await this.getBestActiveTier(session);
    const decayPerSec = bestTier?.multiplierDecayPerSec ?? MULTIPLIER_DECAY_PER_SEC;
    if (session.coolerMultiplier > 1.0) {
      session.coolerMultiplier = Math.max(1.0, session.coolerMultiplier - decayPerSec * (elapsedMs / 1000));
    }

    const machines = await this.machineService.getUserMachines(session.telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
    const catalog = this.machineService.getCatalog();

    let totalYield = 0;

    for (const um of activeMachines) {
      const tier = catalog.find((t) => t.tierCode === um.tierCode);
      if (!tier) continue;

      if (tier.promoOutputCap && tier.promoYieldRate && session.machineMode === 'PROMOTIONAL') {
        const promoRate = tier.promoYieldRate;
        const promoRatePerSec = promoRate * 10;
        const multiplierInfluence = Math.min(session.coolerMultiplier, tier.promoMultiplierInfluence ?? Number.POSITIVE_INFINITY);
        const totalPromoYield = session.baseSpeedGhs * multiplierInfluence * promoRatePerSec * (elapsedMs / 1000);

        const remainingCap = tier.promoOutputCap - session.lifetimePromotionalOutput;
        if (remainingCap <= 0) {
          session.machineMode = 'STANDARD';
        } else if (totalPromoYield >= remainingCap) {
          totalYield += remainingCap;
          session.lifetimePromotionalOutput = tier.promoOutputCap;
          session.machineMode = 'STANDARD';

          const usedFraction = remainingCap / totalPromoYield;
          const remainingMs = elapsedMs * (1 - usedFraction);
          if (remainingMs > 0) {
            const stdRate = tier.passiveYieldRate || 0;
            const stdRatePerSec = stdRate * 10;
            const stdYield = session.baseSpeedGhs * session.coolerMultiplier * stdRatePerSec * (remainingMs / 1000);
            totalYield += stdYield;
          }
        } else {
          totalYield += totalPromoYield;
          session.lifetimePromotionalOutput += totalPromoYield;
        }
      } else {
        const stdRate = tier.passiveYieldRate || 0.00005;
        const stdRatePerSec = stdRate * 10;
        const stdYield = session.baseSpeedGhs * session.coolerMultiplier * stdRatePerSec * (elapsedMs / 1000);
        totalYield += stdYield;
      }
    }

    session.unclaimedBalance += totalYield;
  }

  async getOrCreateSession(telegramUserId: string): Promise<UserMiningState> {
    let session = this.sessions.get(telegramUserId);
    if (!session) {
      session = (await this.loadFromDb(telegramUserId)) ?? undefined;
    }

    // Sync speed dynamically with user's active machines from MachineService
    const machines = await this.machineService.getUserMachines(telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
    const totalGhs = activeMachines.reduce((sum, m) => sum + m.capacityGhs, 0);
    const baseSpeed = totalGhs > 0 ? totalGhs : 1.0;

    if (!session) {
      session = {
        telegramUserId,
        activeCurrency: 'USDT',
        baseSpeedGhs: baseSpeed,
        coolerMultiplier: 1.0,
        unclaimedBalance: 0.0,
        machineMode: 'PROMOTIONAL',
        lifetimePromotionalOutput: 0.0,
        interactivePromotionalOutput: 0.0,
        isOverheated: false,
        cooldownRemaining: 0,
        tapYieldPerTap: 0.01 * 2.0,
        lastUpdatedAt: new Date(),
      };
      this.sessions.set(telegramUserId, session);
    } else {
      session.baseSpeedGhs = baseSpeed;
      await this.accruePassiveYield(session);
      this.sessions.set(telegramUserId, session);
    }

    session.tapYieldPerTap = await this.computeTapYield(session);
    await this.saveToDb(session);
    return session;
  }

  /**
   * Recalculate and persist user mining state baseSpeedGhs based on persistent active machines in DB.
   */
  async recalculateUserMiningState(telegramUserId: string): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    const machines = await this.machineService.getUserMachines(telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
    const totalGhs = activeMachines.reduce((sum, m) => sum + m.capacityGhs, 0);
    session.baseSpeedGhs = totalGhs > 0 ? totalGhs : 1.0;
    session.tapYieldPerTap = await this.computeTapYield(session);
    await this.saveToDb(session);
    this.sessions.set(telegramUserId, session);
    return session;
  }

  async tap(telegramUserId: string): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    if (session.isOverheated) {
      return session;
    }

    // Yield is computed from machine configuration before the multiplier bump,
    // so the credited amount matches the value the UI displayed.
    const increment = await this.computeTapYield(session);

    const bestTier = await this.getBestActiveTier(session);
    session.coolerMultiplier = Math.min(bestTier?.maxMultiplier ?? MAX_MULTIPLIER, session.coolerMultiplier + 0.6);
    session.lastTappedAt = new Date();

    let credit = increment;
    if (session.machineMode === 'PROMOTIONAL') {
      const promoCap = bestTier?.promoOutputCap ?? 5.0;
      const interactiveCap = bestTier?.interactiveBonusCap ?? Number.MAX_SAFE_INTEGER;

      const remainingCap = promoCap - session.lifetimePromotionalOutput;
      const remainingInteractive = interactiveCap - session.interactivePromotionalOutput;

      if (remainingCap <= 0) {
        credit = 0;
        session.machineMode = 'STANDARD';
      } else {
        credit = Math.min(increment, remainingInteractive, remainingCap);
        session.lifetimePromotionalOutput += credit;
        session.interactivePromotionalOutput += credit;
        if (session.lifetimePromotionalOutput >= promoCap) {
          session.lifetimePromotionalOutput = promoCap;
          session.machineMode = 'STANDARD';
        }
      }
    }

    session.unclaimedBalance += credit;
    session.lastUpdatedAt = new Date();

    await this.applyCoolingState(session, new Date());
    session.tapYieldPerTap = await this.computeTapYield(session);

    await this.saveToDb(session);
    return session;
  }

  async toggleCurrency(telegramUserId: string, currency: 'USDT' | 'TON'): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    session.activeCurrency = currency;
    session.tapYieldPerTap = await this.computeTapYield(session);
    await this.saveToDb(session);
    return session;
  }

  async claim(telegramUserId: string): Promise<{ success: boolean; amount: string; session: UserMiningState }> {
    const session = await this.getOrCreateSession(telegramUserId);
    const claimAmount = session.unclaimedBalance;
    if (claimAmount < 0.000001) {
      return { success: false, amount: '0.00', session };
    }

    const reference = `mining_claim_${telegramUserId}_${Date.now()}`;
    const amount = claimAmount.toFixed(6);
    const resetState: UserMiningState = {
      ...session,
      unclaimedBalance: 0.0,
      coolerMultiplier: 1.0, // Reset multiplier on claim
      isOverheated: false,
      cooldownRemaining: 0,
      lastUpdatedAt: new Date(),
    };

    // ONE database transaction: the ledger credit, the financial operation
    // bookkeeping, and the mining-state reset commit together or not at all.
    // Any failure rolls everything back — no credited-wallet-without-reset and
    // no reset-without-credit can ever be observed, so retries cannot double-credit.
    await this.prisma.$transaction(
      async (tx) => {
        await (this.orchestrator as any).requestOperation(
          {
            telegramUserId: BigInt(telegramUserId),
            operationType: FinancialOperationType.SYSTEM_ALLOCATION,
            assetCode: session.activeCurrency,
            amount,
            idempotencyKey: reference,
            reference,
            metadata: { source: 'mining_claim', claimAmount },
          },
          tx,
        );
        await this.persistSession(resetState, tx);
      },
      { timeout: 15000, maxWait: 10000 },
    );

    // Transaction committed — the in-memory session now mirrors the persisted state
    session.unclaimedBalance = 0.0;
    session.coolerMultiplier = 1.0;
    session.isOverheated = false;
    session.cooldownRemaining = 0;
    session.lastUpdatedAt = resetState.lastUpdatedAt;
    session.tapYieldPerTap = await this.computeTapYield(session);
    this.sessions.set(telegramUserId, session);

    return {
      success: true,
      amount,
      session,
    };
  }
}
