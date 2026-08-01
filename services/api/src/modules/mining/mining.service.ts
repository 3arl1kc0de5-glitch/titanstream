import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { FinancialOperationType, UserMachineAsset } from '@prisma/client';
import { MachineService } from '../machine/machine.service';

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
}

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

  private accruePassiveYield(session: UserMiningState) {
    const now = new Date();
    const lastUpdate = session.lastUpdatedAt ? new Date(session.lastUpdatedAt) : new Date();
    session.lastUpdatedAt = now;

    const elapsedMs = now.getTime() - lastUpdate.getTime();
    if (elapsedMs <= 0) return;

    const machines = this.machineService.getUserMachines(session.telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');

    let totalYield = 0;

    for (const um of activeMachines) {
      if (um.tierCode === 'TS_TRIAL') {
        if (session.machineMode === 'PROMOTIONAL') {
          const promoRate = 0.00000289;
          const promoRatePerSec = promoRate * 10;
          const totalPromoYield = session.baseSpeedGhs * 1.0 * promoRatePerSec * (elapsedMs / 1000);
          
          const remainingCap = 5.0 - session.lifetimePromotionalOutput;
          if (totalPromoYield >= remainingCap && remainingCap > 0) {
            totalYield += remainingCap;
            session.lifetimePromotionalOutput = 5.0;
            session.machineMode = 'STANDARD';
            
            const usedFraction = remainingCap / totalPromoYield;
            const remainingMs = elapsedMs * (1 - usedFraction);
            if (remainingMs > 0) {
              const stdRate = 0.0000001929;
              const stdRatePerSec = stdRate * 10;
              const stdYield = session.baseSpeedGhs * 1.0 * stdRatePerSec * (remainingMs / 1000);
              totalYield += stdYield;
            }
          } else {
            totalYield += totalPromoYield;
            session.lifetimePromotionalOutput += totalPromoYield;
          }
        } else {
          const stdRate = 0.0000001929;
          const stdRatePerSec = stdRate * 10;
          const stdYield = session.baseSpeedGhs * 1.0 * stdRatePerSec * (elapsedMs / 1000);
          totalYield += stdYield;
        }
      } else {
        const catalog = this.machineService.getCatalog();
        const tier = catalog.find((t) => t.tierCode === um.tierCode);
        const rate = tier?.passiveYieldRate || 0.00005;
        const ratePerSec = rate * 10;
        const machineYield = session.baseSpeedGhs * 1.0 * ratePerSec * (elapsedMs / 1000);
        totalYield += machineYield;
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
        lastUpdatedAt: new Date(),
      };
      this.sessions.set(telegramUserId, session);
    } else {
      session.baseSpeedGhs = baseSpeed;
      this.accruePassiveYield(session);
      this.sessions.set(telegramUserId, session);
    }

    await this.saveToDb(session);
    return session;
  }

  async tap(telegramUserId: string, tapYield?: number): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    session.coolerMultiplier = Math.min(20.2, session.coolerMultiplier + 0.6);
    session.lastTappedAt = new Date();
    
    let increment = typeof tapYield === 'number' && !isNaN(tapYield) ? tapYield : 0.05;
    
    if (session.machineMode === 'PROMOTIONAL') {
      const remainingCap = 5.0 - session.lifetimePromotionalOutput;
      if (increment >= remainingCap) {
        increment = remainingCap;
        session.lifetimePromotionalOutput = 5.0;
        session.machineMode = 'STANDARD';
      } else {
        session.lifetimePromotionalOutput += increment;
      }
    }
    
    session.unclaimedBalance += increment;
    session.lastUpdatedAt = new Date();
    
    await this.saveToDb(session);
    return session;
  }

  async toggleCurrency(telegramUserId: string, currency: 'USDT' | 'TON'): Promise<UserMiningState> {
    const session = await this.getOrCreateSession(telegramUserId);
    session.activeCurrency = currency;
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
