import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SymptomDto {
  @IsString()
  @MaxLength(255)
  symptomName: string;

  @IsInt()
  @Min(1)
  @Max(5)
  severity: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string;
}
