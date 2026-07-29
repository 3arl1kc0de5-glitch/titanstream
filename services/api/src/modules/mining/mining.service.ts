import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { FinancialOperationType } from '@prisma/client';

export interface UserMiningState {
  telegramUserId: string;
  activeCurrency: 'USDT' | 'TON';
  baseSpeedGhs: number;
  coolerMultiplier: number;
  unclaimedBalance: number;
  lastTappedAt?: Date;
}

@Injectable()
export class MiningService {
  // In-memory store for user mining sessions (acts as a Redis fallback)
  private readonly sessions = new Map<string, UserMiningState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: FinancialOrchestratorService,
  ) {}

  getOrCreateSession(telegramUserId: string): UserMiningState {
    let session = this.sessions.get(telegramUserId);
    if (!session) {
      session = {
        telegramUserId,
        activeCurrency: 'USDT',
        baseSpeedGhs: 2.6,
        coolerMultiplier: 1.0,
        unclaimedBalance: 0.0,
      };
      this.sessions.set(telegramUserId, session);
    }
    return session;
  }

  tap(telegramUserId: string): UserMiningState {
    const session = this.getOrCreateSession(telegramUserId);
    session.coolerMultiplier = Math.min(20.2, session.coolerMultiplier + 0.6);
    session.lastTappedAt = new Date();
    // Simulate mining increment per tap
    session.unclaimedBalance += 0.05; 
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
