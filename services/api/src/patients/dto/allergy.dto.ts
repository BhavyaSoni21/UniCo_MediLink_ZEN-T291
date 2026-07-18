import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { allergy_severity_enum } from '../../../generated/prisma/enums';

export class AllergyDto {
  @IsString()
  @MaxLength(255)
  allergyName: string;

  @IsOptional()
  @IsIn(Object.values(allergy_severity_enum))
  severity?: string;

  @IsOptional()
  @IsString()
  reaction?: string;
}
