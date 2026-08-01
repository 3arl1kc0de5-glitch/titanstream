import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CommandProcessorService } from './command-processor.service';
import { IdempotencyService } from './idempotency.service';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class FinancialOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
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
  }, client?: DbClient) {
    const reference = command.reference || `op_${command.telegramUserId}_${command.idempotencyKey}`;
    const normalized = { ...command, reference };

    // Idempotency record, operation, workflow steps, transaction and ledger
    // entries commit as ONE unit. Any failure rolls everything back — no
    // partial state (e.g. credited ledger without a completed operation).
    if (client) {
      return this.executeWithIdempotency(client, normalized);
    }
    return this.prisma.$transaction(
      (tx) => this.executeWithIdempotency(tx, normalized),
      { timeout: 15000, maxWait: 10000 },
    );
  }

  private async executeWithIdempotency(client: DbClient, normalized: {
    telegramUserId: bigint;
    operationType: any;
    assetCode: string;
    amount: string;
    idempotencyKey: string;
    reference: string;
    metadata?: Record<string, unknown>;
  }) {
    const state = await this.idempotency.begin(normalized.telegramUserId, normalized.idempotencyKey, normalized, client);
    if (state.replay) return state.record.responsePayload;

    const result = await this.commands.execute(normalized, client);
    // Prisma returns BigInt for BigInt columns; storing the raw record in a Json
    // column (and returning it to HTTP controllers) would crash JSON
    // serialization with "Do not know how to serialize a BigInt".
    const jsonSafe = this.toJsonSafe(result);
    await this.idempotency.complete(state.record.id, result?.id || '', jsonSafe, client);
    return jsonSafe;
  }

  /**
   * Deep-convert BigInt values to strings so records can be persisted in Json
   * columns and returned over HTTP without throwing during JSON serialization.
   */
  private toJsonSafe<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item)));
  }
}
