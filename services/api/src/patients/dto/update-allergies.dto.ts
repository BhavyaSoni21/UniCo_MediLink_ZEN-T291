import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AllergyDto } from './allergy.dto';

export class UpdateAllergiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllergyDto)
  allergies: AllergyDto[];
}
