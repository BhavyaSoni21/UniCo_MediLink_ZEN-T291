import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { SymptomDto } from './symptom.dto';

export class SubmitSymptomsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SymptomDto)
  symptoms: SymptomDto[];
}
