import { Injectable } from '@nestjs/common';
import { OperatorAvailability, OperatorStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OperatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    displayName: string;
    whatsappNumber: string;
    telegramUsername?: string;
    country: string;
    supportedCurrencies: string[];
    supportedMobileMoneyNetworks: string[];
    mobileMoneyNumber: string;
    capacity: number;
    trustScore: number;
    averageCompletionTimeSeconds: number;
    dailyLimit: string;
  }) {
    return this.prisma.operator.create({
      data: {
        ...data,
        dailyLimit: new Prisma.Decimal(data.dailyLimit),
        supportedCurrencies: data.supportedCurrencies as Prisma.InputJsonValue,
        supportedMobileMoneyNetworks: data.supportedMobileMoneyNetworks as Prisma.InputJsonValue,
      },
    });
  }

  findRoutable(params: { country: string; network: string; asset: string }) {
    return this.prisma.operator.findMany({
      where: {
        country: params.country,
        status: OperatorStatus.ACTIVE,
        availability: OperatorAvailability.ONLINE,
      },
    });
  }

  incrementLoad(operatorId: string) {
    return this.prisma.operator.update({
      where: { id: operatorId },
      data: { currentLoad: { increment: 1 } },
    });
  }

  decrementLoad(operatorId: string) {
    return this.prisma.operator.update({
      where: { id: operatorId },
      data: { currentLoad: { decrement: 1 } },
    });
  }
}
