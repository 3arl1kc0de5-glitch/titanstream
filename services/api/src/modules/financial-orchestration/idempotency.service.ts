import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  hashPayload(payload: unknown) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async begin(telegramUserId: bigint, idempotencyKey: string, payload: unknown) {
    const requestHash = this.hashPayload(payload);
    const existing = await this.prisma.financialIdempotencyRecord.findUnique({
      where: { telegramUserId_idempotencyKey: { telegramUserId, idempotencyKey } },
    });

    if (!existing) {
      return {
        replay: false,
        record: await this.prisma.financialIdempotencyRecord.create({
          data: { telegramUserId, idempotencyKey, requestHash, status: IdempotencyStatus.STARTED },
        }),
      };
    }

    if (existing.requestHash !== requestHash) throw new BadRequestException('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    if (existing.status === IdempotencyStatus.COMPLETED) return { replay: true, record: existing };
    if (existing.status === IdempotencyStatus.STARTED) throw new BadRequestException('IDEMPOTENT_OPERATION_IN_PROGRESS');

    await this.prisma.financialIdempotencyRecord.update({
      where: { id: existing.id },
      data: { status: IdempotencyStatus.STARTED, requestHash },
    });
    return { replay: false, record: existing };
  }

  complete(id: string, operationId: string, responsePayload: unknown) {
    return this.prisma.financialIdempotencyRecord.update({
      where: { id },
      data: {
        operationId,
        status: IdempotencyStatus.COMPLETED,
        responsePayload: responsePayload as Prisma.InputJsonValue,
      },
    });
  }

  fail(id: string, operationId?: string) {
    return this.prisma.financialIdempotencyRecord.update({
      where: { id },
      data: { operationId, status: IdempotencyStatus.FAILED },
    });
  }
}
