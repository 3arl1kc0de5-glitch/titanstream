import { Injectable } from '@nestjs/common';
import { OperatorAvailability, OperatorStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorRepository } from './operator.repository';

@Injectable()
export class OperatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: OperatorRepository,
  ) {}

  create(dto: CreateOperatorDto) {
    return this.operators.create(dto);
  }

  list() {
    return this.prisma.operator.findMany({ orderBy: { createdAt: 'desc' } });
  }

  setAvailability(operatorId: string, availability: OperatorAvailability) {
    return this.prisma.operator.update({ where: { id: operatorId }, data: { availability } });
  }

  suspend(operatorId: string) {
    return this.prisma.operator.update({ where: { id: operatorId }, data: { status: OperatorStatus.SUSPENDED } });
  }
}
