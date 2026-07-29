import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OperatorAvailability } from '@prisma/client';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorService } from './operator.service';

@Controller('api/v1/operators')
export class OperatorController {
  constructor(private readonly operators: OperatorService) {}

  @Post()
  create(@Body() dto: CreateOperatorDto) {
    return this.operators.create(dto);
  }

  @Get()
  list() {
    return this.operators.list();
  }

  @Patch(':operatorId/availability/:availability')
  setAvailability(@Param('operatorId') operatorId: string, @Param('availability') availability: OperatorAvailability) {
    return this.operators.setAvailability(operatorId, availability);
  }

  @Patch(':operatorId/suspend')
  suspend(@Param('operatorId') operatorId: string) {
    return this.operators.suspend(operatorId);
  }
}
