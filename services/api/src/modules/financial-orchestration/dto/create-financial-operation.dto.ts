import { FinancialOperationType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreateFinancialOperationDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsEnum(FinancialOperationType)
  operationType!: FinancialOperationType;

  @IsString()
  @IsNotEmpty()
  assetCode!: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  amount!: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
