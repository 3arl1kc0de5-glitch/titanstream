import { IsInt, Min, Max, IsNumber, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  questionIndex: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  selectedIndex: number;
}

export class CompleteModuleDto {
  @ApiProperty()
  @MinLength(1)
  moduleId: string;
}

export class UpdateProgressDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  currentSlideIndex: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  timeSpentSeconds: number;
}