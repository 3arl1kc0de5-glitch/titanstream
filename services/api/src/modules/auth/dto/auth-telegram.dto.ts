import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthTelegramDto {
  @ApiProperty({ description: 'Telegram initData string' })
  @IsString()
  @IsNotEmpty()
  initData: string;
}

export class TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export class ParsedInitData {
  user: TelegramUserData;
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
}