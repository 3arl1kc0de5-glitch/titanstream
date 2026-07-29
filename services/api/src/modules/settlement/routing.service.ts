import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OperatorRepository } from './operator.repository';
import { SettlementRiskService } from './settlement-risk.service';

@Injectable()
export class RoutingService {
  constructor(
    private readonly operators: OperatorRepository,
    @Optional() private readonly riskService?: SettlementRiskService,
  ) {}

  async selectOperator(params: { country: string; network: string; asset: string; requestedAmount: string }) {
    const amount = new Prisma.Decimal(params.requestedAmount);
    const candidates = await this.operators.findRoutable(params);
    const filteredByCapacity: typeof candidates = [];

    for (const operator of candidates) {
      const currencies = Array.isArray(operator.supportedCurrencies) ? operator.supportedCurrencies : [];
      const networks = Array.isArray(operator.supportedMobileMoneyNetworks) ? operator.supportedMobileMoneyNetworks : [];
      const basicEligible = (
        currencies.includes(params.asset) &&
        networks.includes(params.network) &&
        operator.currentLoad < operator.capacity &&
        new Prisma.Decimal(operator.dailyLimit).gte(amount)
      );

      if (!basicEligible) continue;

      if (this.riskService) {
        const capacityCheck = await this.riskService.evaluateMerchantCapacity(operator.id, Number(amount));
        if (!capacityCheck.allowed) continue;
      }

      filteredByCapacity.push(operator);
    }

    filteredByCapacity.sort((a: any, b: any) => {
      const loadA = a.currentLoad / Math.max(a.capacity, 1);
      const loadB = b.currentLoad / Math.max(b.capacity, 1);
      return loadA - loadB || b.trustScore - a.trustScore || a.averageCompletionTimeSeconds - b.averageCompletionTimeSeconds;
    });

    const operator = filteredByCapacity[0];
    if (!operator) throw new BadRequestException('NO_AVAILABLE_INTERNAL_OPERATIONS');
    return operator;
  }
}
