import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { MedicationDto } from './medication.dto';

export class UpdateMedicationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications: MedicationDto[];
}
