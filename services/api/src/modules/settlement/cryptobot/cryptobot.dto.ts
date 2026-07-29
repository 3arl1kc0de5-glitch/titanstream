import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateCryptoBotInvoiceDto {
  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  payload?: string;
}

export class CryptoBotWebhookDto {
  @IsNotEmpty()
  update_id: number;

  @IsString()
  @IsNotEmpty()
  update_type: string;

  @IsString()
  @IsNotEmpty()
  request_date: string;

  @IsNotEmpty()
  payload: any;
}
