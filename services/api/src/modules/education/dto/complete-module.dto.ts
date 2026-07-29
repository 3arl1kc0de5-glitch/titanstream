import { IsOptional, IsObject } from 'class-validator';

export class CompleteModuleDto {
  @IsOptional()
  @IsObject()
  acknowledgement?: Record<string, unknown>;
}
