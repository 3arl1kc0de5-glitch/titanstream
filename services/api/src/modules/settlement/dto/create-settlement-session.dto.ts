import { SettlementProviderId } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateSettlementSessionDto {
  @IsEnum(SettlementProviderId)
  @IsOptional()
  provider?: SettlementProviderId;

  @IsString()
  @IsNotEmpty()
  asset!: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  requestedAmount!: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  expectedCryptoAmount!: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  exchangeRate!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  mobileMoneyNetwork!: string;
}
