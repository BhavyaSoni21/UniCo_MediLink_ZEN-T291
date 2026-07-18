import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { condition_status_enum } from '../../../generated/prisma/enums';

export class MedicalConditionDto {
  @IsString()
  @MaxLength(255)
  conditionName: string;

  @IsOptional()
  @IsDateString()
  diagnosisDate?: string;

  @IsOptional()
  @IsIn(Object.values(condition_status_enum))
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
