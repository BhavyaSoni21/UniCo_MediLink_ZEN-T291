import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { record_type_enum } from '../../../generated/prisma/enums';

export class UploadRecordDto {
  @IsOptional()
  @IsIn(Object.values(record_type_enum))
  recordType?: string;

  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;
}
