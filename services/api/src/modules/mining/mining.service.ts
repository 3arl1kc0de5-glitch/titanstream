import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { FinancialOperationType } from '@prisma/client';
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
        isOverheated: false,
        cooldownRemaining: 0,
        tapYieldPerTap: 0,
      };
    } catch (err) {
      console.warn('Failed to load mining state from DB:', err);
      return null;
    }
  }

  private async saveToDb(session: UserMiningState): Promise<void> {
    try {
      await this.prisma.userMiningState.upsert({
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
        },
      });
    } catch (err) {
      console.warn('Failed to save mining state to DB:', err);
    }
  }

  /**
   * Derive the thermal state of the machine. The overheat window opens when the
   * cooler multiplier reaches its cap and closes 15s after the last tap. While
   * overheated the multiplier is frozen and the engine pauses; when the window
   * closes the core resets to 1.0 so tapping can resume cleanly.
   */
  private applyCoolingState(session: UserMiningState, now: Date): void {
    const lastTap = session.lastTappedAt ? new Date(session.lastTappedAt).getTime() : 0;
    const overheated = session.coolerMultiplier >= MAX_MULTIPLIER && now.getTime() - lastTap < OVERHEAT_MS;
    if (overheated) {
      session.isOverheated = true;
      session.cooldownRemaining = Math.max(0, Math.ceil((OVERHEAT_MS - (now.getTime() - lastTap)) / 1000));
      return;
    }
    session.isOverheated = false;
    session.cooldownRemaining = 0;
    if (session.coolerMultiplier >= MAX_MULTIPLIER) {
      session.coolerMultiplier = 1.0; // cooldown finished — core resets
    }
  }

  /**
   * Server-computed per-tap yield from the machine configuration. The client
   * never supplies yield numbers — it only renders this value.
   */
  private computeTapYield(session: UserMiningState): number {
    const activeMachines = this.machineService.getUserMachines(session.telegramUserId).filter((m) => m.status === 'ACTIVE');
    const catalog = this.machineService.getCatalog();

    let bestTier: MachineTier | undefined;
    for (const um of activeMachines) {
      const tier = catalog.find((t) => t.tierCode === um.tierCode);
      if (!tier) continue;
      if (!bestTier || tier.capacityGhs > bestTier.capacityGhs) bestTier = tier;
    }

    const dailyYield = bestTier?.dailyYieldEstimateUsdt ?? 2.0;
    const payout = session.activeCurrency === 'TON' ? dailyYield * 1.15 : dailyYield;
    let yieldValue = 0.01 * session.coolerMultiplier * payout;

    if (bestTier?.promoOutputCap && session.machineMode === 'PROMOTIONAL') {
      const remainingCap = Math.max(0, bestTier.promoOutputCap - session.lifetimePromotionalOutput);
      yieldValue = Math.min(yieldValue, remainingCap);
    }

    return yieldValue;
  }

  private accruePassiveYield(session: UserMiningState) {
    const now = new Date();
    const lastUpdate = session.lastUpdatedAt ? new Date(session.lastUpdatedAt) : new Date();
    session.lastUpdatedAt = now;

    const elapsedMs = now.getTime() - lastUpdate.getTime();
    this.applyCoolingState(session, now);
    if (elapsedMs <= 0) return;

    // While the machine is cooling down it is genuinely inactive: the engine
    // pauses so the spinner and the counter always move together.
    if (session.isOverheated) {
      return;
    }

    // Cooler naturally decays toward 1.0 (0.5x per second) unless overheated
    if (session.coolerMultiplier > 1.0) {
      session.coolerMultiplier = Math.max(1.0, session.coolerMultiplier - MULTIPLIER_DECAY_PER_SEC * (elapsedMs / 1000));
    }

    const machines = this.machineService.getUserMachines(session.telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
    const catalog = this.machineService.getCatalog();

    let totalYield = 0;

    for (const um of activeMachines) {
      const tier = catalog.find((t) => t.tierCode === um.tierCode);
      if (!tier) continue;

      if (tier.promoOutputCap && tier.promoYieldRate && session.machineMode === 'PROMOTIONAL') {
        const promoRate = tier.promoYieldRate;
        const promoRatePerSec = promoRate * 10;
        const totalPromoYield = session.baseSpeedGhs * session.coolerMultiplier * promoRatePerSec * (elapsedMs / 1000);

        const remainingCap = tier.promoOutputCap - session.lifetimePromotionalOutput;
        if (totalPromoYield >= remainingCap && remainingCap > 0) {
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
    const machines = this.machineService.getUserMachines(telegramUserId);
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
        isOverheated: false,
        cooldownRemaining: 0,
        tapYieldPerTap: 0.01 * 2.0,
        lastUpdatedAt: new Date(),
      };
      this.sessions.set(telegramUserId, session);
    } else {
      session.baseSpeedGhs = baseSpeed;
      this.accruePassiveYield(session);
      this.sessions.set(telegramUserId, session);
    }

    session.tapYieldPerTap = this.computeTapYield(session);
    await this.saveToDb(session);
    return session;
  }

  async tap(telegramUserId: string): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    if (session.isOverheated) {
      return session;
    }

    // Yield is computed from machine configuration before the multiplier bump,
    // so the credited amount matches the value the UI displayed.
    const increment = this.computeTapYield(session);

    session.coolerMultiplier = Math.min(MAX_MULTIPLIER, session.coolerMultiplier + 0.6);
    session.lastTappedAt = new Date();

    let credit = increment;
    if (session.machineMode === 'PROMOTIONAL') {
      const machines = this.machineService.getUserMachines(telegramUserId);
      const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
      const catalog = this.machineService.getCatalog();
      let promoCap = 5.0;
      for (const um of activeMachines) {
        const tier = catalog.find((t) => t.tierCode === um.tierCode);
        if (tier?.promoOutputCap) {
          promoCap = tier.promoOutputCap;
          break;
        }
      }

      const remainingCap = promoCap - session.lifetimePromotionalOutput;
      if (increment >= remainingCap) {
        credit = remainingCap;
        session.lifetimePromotionalOutput = promoCap;
        session.machineMode = 'STANDARD';
      } else {
        session.lifetimePromotionalOutput += increment;
      }
    }

    session.unclaimedBalance += credit;
    session.lastUpdatedAt = new Date();

    this.applyCoolingState(session, new Date());
    session.tapYieldPerTap = this.computeTapYield(session);

    await this.saveToDb(session);
    return session;
  }

  async toggleCurrency(telegramUserId: string, currency: 'USDT' | 'TON'): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    session.activeCurrency = currency;
    session.tapYieldPerTap = this.computeTapYield(session);
    await this.saveToDb(session);
    return session;
  }

  async claim(telegramUserId: string): Promise<{ success: boolean; amount: string; session: UserMiningState }> {
    const session = await this.getOrCreateSession(telegramUserId);
    const claimAmount = session.unclaimedBalance;
    if (claimAmount <= 0) {
      return { success: false, amount: '0.00', session };
    }

    // Reset unclaimed balance
    session.unclaimedBalance = 0.0;
    session.coolerMultiplier = 1.0; // Reset multiplier on claim
    session.isOverheated = false;
    session.cooldownRemaining = 0;
    session.tapYieldPerTap = this.computeTapYield(session);

    // Allocate USDT reward via FinancialOrchestrator (balanced double-entry)
    const reference = `mining_claim_${telegramUserId}_${Date.now()}`;
    await this.orchestrator.requestOperation({
      telegramUserId: BigInt(telegramUserId),
      operationType: FinancialOperationType.SYSTEM_ALLOCATION,
      assetCode: session.activeCurrency,
      amount: claimAmount.toFixed(6),
      idempotencyKey: reference,
      reference,
      metadata: { source: 'mining_claim', claimAmount },
    });

    await this.saveToDb(session);

    return {
      success: true,
      amount: claimAmount.toFixed(6),
      session,
    };
  }
}
