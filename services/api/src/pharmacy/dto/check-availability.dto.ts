import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CheckAvailabilityDto {
  @IsUUID()
  medicineId: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
