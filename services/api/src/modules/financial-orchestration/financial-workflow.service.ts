import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialOperationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaService;

const ALLOWED_TRANSITIONS: Record<FinancialOperationStatus, FinancialOperationStatus[]> = {
  REQUESTED: [FinancialOperationStatus.VALIDATED, FinancialOperationStatus.FAILED_VALIDATION, FinancialOperationStatus.CANCELLED],
  VALIDATED: [FinancialOperationStatus.AUTHORIZED, FinancialOperationStatus.FAILED_RISK],
  AUTHORIZED: [FinancialOperationStatus.EXECUTING, FinancialOperationStatus.CANCELLED],
  EXECUTING: [FinancialOperationStatus.POSTED, FinancialOperationStatus.FAILED_EXECUTION, FinancialOperationStatus.FAILED_EXTERNAL_PROVIDER],
  POSTED: [FinancialOperationStatus.COMPLETED, FinancialOperationStatus.FAILED_EXECUTION],
  COMPLETED: [],
  FAILED_VALIDATION: [],
  FAILED_RISK: [],
  FAILED_EXECUTION: [],
  FAILED_EXTERNAL_PROVIDER: [],
  CANCELLED: [],
};

@Injectable()
export class FinancialWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(operationId: string, nextStatus: FinancialOperationStatus, trigger: string, metadata: Record<string, unknown> = {}, client: DbClient = this.prisma) {
    const operation = await client.financialOperation.findUnique({ where: { id: operationId } });
    if (!operation) throw new BadRequestException('FINANCIAL_OPERATION_NOT_FOUND');
    if (!ALLOWED_TRANSITIONS[operation.status].includes(nextStatus)) {
      throw new BadRequestException(`INVALID_OPERATION_TRANSITION:${operation.status}->${nextStatus}`);
    }

    const updated = await client.financialOperation.update({
      where: { id: operationId },
      data: {
        status: nextStatus,
        completedAt: this.isTerminal(nextStatus) ? new Date() : operation.completedAt,
      },
    });

    await client.financialWorkflowStep.create({
      data: {
        operationId,
        previousStatus: operation.status,
        newStatus: nextStatus,
        trigger,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  private isTerminal(status: FinancialOperationStatus) {
    const terminalStatuses: FinancialOperationStatus[] = [
      FinancialOperationStatus.COMPLETED,
      FinancialOperationStatus.FAILED_VALIDATION,
      FinancialOperationStatus.FAILED_RISK,
      FinancialOperationStatus.FAILED_EXECUTION,
      FinancialOperationStatus.FAILED_EXTERNAL_PROVIDER,
      FinancialOperationStatus.CANCELLED,
    ];
    return terminalStatuses.includes(status);
  }
}
