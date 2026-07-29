import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  whatsappNumber!: string;

  @IsString()
  @IsOptional()
  telegramUsername?: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsArray()
  supportedCurrencies!: string[];

  @IsArray()
  supportedMobileMoneyNetworks!: string[];

  @IsString()
  @IsNotEmpty()
  mobileMoneyNumber!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  trustScore!: number;

  @IsInt()
  @Min(1)
  averageCompletionTimeSeconds!: number;

  @IsString()
  @IsNotEmpty()
  dailyLimit!: string;
}
