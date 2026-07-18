import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class MedicationDto {
  @IsString()
  @MaxLength(255)
  medicineName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
