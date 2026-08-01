import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { FinancialOperationType } from '@prisma/client';
import { MachineService } from '../machine/machine.service';

export interface UserMiningState {
  telegramUserId: string;
  activeCurrency: 'USDT' | 'TON';
  baseSpeedGhs: number;
  coolerMultiplier: number;
  unclaimedBalance: number;
  lastTappedAt?: Date;
  lastUpdatedAt?: Date;
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

  private accruePassiveYield(session: UserMiningState) {
    const now = new Date();
    const lastUpdate = session.lastUpdatedAt ? new Date(session.lastUpdatedAt) : new Date();
    session.lastUpdatedAt = now;

    const elapsedMs = now.getTime() - lastUpdate.getTime();
    if (elapsedMs <= 0) return;

    // Use the highest passiveYieldRate from the user's active machines
    const machines = this.machineService.getUserMachines(session.telegramUserId);
    const activeMachines = machines.filter((m) => m.status === 'ACTIVE');
    const catalog = this.machineService.getCatalog();
    
    // Find the best passiveYieldRate across the user's active fleet
    let bestPassiveRate = 0.00005; // default fallback
    for (const um of activeMachines) {
      const tier = catalog.find((t) => t.tierCode === um.tierCode);
      if (tier?.passiveYieldRate && tier.passiveYieldRate > bestPassiveRate) {
        bestPassiveRate = tier.passiveYieldRate;
      }
    }

    // Passive yield: speed * multiplier * yieldRate * elapsed
    // For passive background mining, baseline multiplier of 1.0
    const baseYieldRatePerSec = bestPassiveRate * 10; // convert per-100ms to per-second
    const deltaPerSec = session.baseSpeedGhs * 1.0 * baseYieldRatePerSec;
    const accumulated = (elapsedMs / 1000) * deltaPerSec;

    session.unclaimedBalance += accumulated;
  }

  getOrCreateSession(telegramUserId: string): UserMiningState {
    let session = this.sessions.get(telegramUserId);
    
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
        lastUpdatedAt: new Date(),
      };
      this.sessions.set(telegramUserId, session);
    } else {
      session.baseSpeedGhs = baseSpeed;
      this.accruePassiveYield(session);
    }
    return session;
  }

  tap(telegramUserId: string, tapYield?: number): UserMiningState {
    const session = this.getOrCreateSession(telegramUserId);
    session.coolerMultiplier = Math.min(20.2, session.coolerMultiplier + 0.6);
    session.lastTappedAt = new Date();
    
    const increment = typeof tapYield === 'number' && !isNaN(tapYield) ? tapYield : 0.05;
    session.unclaimedBalance += increment;
    session.lastUpdatedAt = new Date();
    return session;
  }


  toggleCurrency(telegramUserId: string, currency: 'USDT' | 'TON'): UserMiningState {
    const session = this.getOrCreateSession(telegramUserId);
    session.activeCurrency = currency;
    return session;
  }

  async claim(telegramUserId: string): Promise<{ success: boolean; amount: string; session: UserMiningState }> {
    const session = this.getOrCreateSession(telegramUserId);
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

    return {
      success: true,
      amount: claimAmount.toFixed(6),
      session,
    };
  }
}
