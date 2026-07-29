import { Injectable } from '@nestjs/common';
import { CommandProcessorService } from './command-processor.service';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class FinancialOrchestratorService {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly commands: CommandProcessorService,
  ) {}

  async requestOperation(command: {
    telegramUserId: bigint;
    operationType: any;
    assetCode: string;
    amount: string;
    idempotencyKey: string;
    reference?: string;
    metadata?: Record<string, unknown>;
  }) {
    const reference = command.reference || `op_${command.telegramUserId}_${command.idempotencyKey}`;
    const normalized = { ...command, reference };
    const state = await this.idempotency.begin(command.telegramUserId, command.idempotencyKey, normalized);
    if (state.replay) return state.record.responsePayload;

    try {
      const result = await this.commands.execute(normalized);
      await this.idempotency.complete(state.record.id, result?.id || '', result);
      return result;
    } catch (error) {
      await this.idempotency.fail(state.record.id);
      throw error;
    }
  }
}
