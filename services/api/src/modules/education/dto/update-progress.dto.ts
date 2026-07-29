import { IsInt, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  currentSlideIndex!: number;

  @IsInt()
  @Min(0)
  timeSpentSeconds!: number;
}
