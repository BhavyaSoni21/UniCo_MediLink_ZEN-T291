import { IsIn, IsInt, IsNumber, IsOptional } from 'class-validator';
import { source_type_enum } from '../../../generated/prisma/enums';

export class SubmitVitalsDto {
  @IsOptional()
  @IsInt()
  heartRate?: number;

  @IsOptional()
  @IsInt()
  spo2?: number;

  @IsOptional()
  @IsInt()
  systolicBp?: number;

  @IsOptional()
  @IsInt()
  diastolicBp?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsInt()
  respiratoryRate?: number;

  @IsOptional()
  @IsIn(Object.values(source_type_enum))
  sourceType?: string;
}
