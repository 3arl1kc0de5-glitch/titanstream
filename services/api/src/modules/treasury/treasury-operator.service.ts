import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentOrderService } from '../payment-order/payment-order.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@prisma/client';

export type DutyStatus = 'ACTIVE' | 'ON_CALL' | 'OFF_DUTY';

export interface TreasuryOperatorProfile {
  id: string;
  name: string;
  role: 'TREASURY_OPERATOR' | 'TREASURY_SUPERVISOR' | 'TREASURY_AUDITOR';
  dutyStatus: DutyStatus;
  countryScope: string;
  verificationsCompletedCount: number;
  lastActiveAt: string;
}

@Injectable()
export class TreasuryOperatorService {
  private readonly logger = new Logger(TreasuryOperatorService.name);

  private readonly operators = new Map<string, TreasuryOperatorProfile>();

  constructor(
    private readonly paymentOrderService: PaymentOrderService,
    private readonly audit: AuditService,
  ) {
    this.seedDefaultOperators();
  }

  private seedDefaultOperators() {
    const op1: TreasuryOperatorProfile = {
      id: 'admin_duty_1',
      name: 'Duty Operator (UG Escrow)',
      role: 'TREASURY_OPERATOR',
      dutyStatus: 'ACTIVE',
      countryScope: 'UG',
      verificationsCompletedCount: 42,
      lastActiveAt: new Date().toISOString(),
    };
    const op2: TreasuryOperatorProfile = {
      id: 'admin_duty_2',
      name: 'Supervisor Duty Engineer',
      role: 'TREASURY_SUPERVISOR',
      dutyStatus: 'ON_CALL',
      countryScope: 'GLOBAL',
      verificationsCompletedCount: 128,
      lastActiveAt: new Date().toISOString(),
    };

    this.operators.set(op1.id, op1);
    this.operators.set(op2.id, op2);
  }

  getRoster(): TreasuryOperatorProfile[] {
    return Array.from(this.operators.values());
  }

  setDutyStatus(operatorId: string, dutyStatus: DutyStatus): TreasuryOperatorProfile {
    let op = this.operators.get(operatorId);
    if (!op) {
      op = {
        id: operatorId,
        name: `Operator ${operatorId}`,
        role: 'TREASURY_OPERATOR',
        dutyStatus,
        countryScope: 'GLOBAL',
        verificationsCompletedCount: 0,
        lastActiveAt: new Date().toISOString(),
      };
    }
    op.dutyStatus = dutyStatus;
    op.lastActiveAt = new Date().toISOString();
    this.operators.set(operatorId, op);
    return op;
  }

  getVerificationQueue() {
    const allOrders = this.paymentOrderService.getAllOrders();
    return allOrders.filter(
      (o) => o.status === 'AWAITING_VERIFICATION' || o.status === 'AWAITING_PAYMENT',
    );
  }

  async verifyPaymentOrder(
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    operatorId: string,
    reason?: string,
  ) {
    const operator = this.operators.get(operatorId) || {
      id: operatorId,
      name: 'Treasury Admin',
      role: 'TREASURY_OPERATOR',
      dutyStatus: 'ACTIVE',
      countryScope: 'GLOBAL',
      verificationsCompletedCount: 0,
      lastActiveAt: new Date().toISOString(),
    };

    if (action === 'APPROVE') {
      const order = await this.paymentOrderService.approveOrder(orderId, operatorId);
      operator.verificationsCompletedCount += 1;
      operator.lastActiveAt = new Date().toISOString();
      this.operators.set(operatorId, operator);

      this.logger.log(`[TreasuryOperator] Order ${order.reference} APPROVED by ${operator.name}`);
      return order;
    } else {
      const order = await this.paymentOrderService.rejectOrder(
        orderId,
        reason || 'Rejected by Treasury Operator',
        operatorId,
      );
      this.logger.log(`[TreasuryOperator] Order ${order.reference} REJECTED by ${operator.name}: ${reason}`);
      return order;
    }
  }
}
