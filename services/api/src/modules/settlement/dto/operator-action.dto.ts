import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class OperatorAmountActionDto {
  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  amount!: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class OperatorNoteDto {
  @IsString()
  @IsNotEmpty()
  note!: string;
}
