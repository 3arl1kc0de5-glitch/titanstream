import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  hashPayload(payload: unknown) {
    const jsonSafeString = JSON.stringify(payload, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    return createHash('sha256').update(jsonSafeString).digest('hex');
  }

  async begin(telegramUserId: bigint, idempotencyKey: string, payload: unknown, client: DbClient = this.prisma) {
    const requestHash = this.hashPayload(payload);
    const existing = await client.financialIdempotencyRecord.findUnique({
      where: { telegramUserId_idempotencyKey: { telegramUserId, idempotencyKey } },
    });

    if (!existing) {
      return {
        replay: false,
        record: await client.financialIdempotencyRecord.create({
          data: { telegramUserId, idempotencyKey, requestHash, status: IdempotencyStatus.STARTED },
        }),
      };
    }

    if (existing.requestHash !== requestHash) throw new BadRequestException('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    if (existing.status === IdempotencyStatus.COMPLETED) return { replay: true, record: existing };
    if (existing.status === IdempotencyStatus.STARTED) throw new BadRequestException('IDEMPOTENT_OPERATION_IN_PROGRESS');

    await client.financialIdempotencyRecord.update({
      where: { id: existing.id },
      data: { status: IdempotencyStatus.STARTED, requestHash },
    });
    return { replay: false, record: existing };
  }

  complete(id: string, operationId: string, responsePayload: unknown, client: DbClient = this.prisma) {
    return client.financialIdempotencyRecord.update({
      where: { id },
      data: {
        operationId,
        status: IdempotencyStatus.COMPLETED,
        responsePayload: responsePayload as Prisma.InputJsonValue,
      },
    });
  }

  fail(id: string, operationId?: string, client: DbClient = this.prisma) {
    return client.financialIdempotencyRecord.update({
      where: { id },
      data: { operationId, status: IdempotencyStatus.FAILED },
    });
  }
}
