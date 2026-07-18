import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { MedicalConditionDto } from './medical-condition.dto';

export class UpdateMedicalHistoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalConditionDto)
  conditions: MedicalConditionDto[];
}
