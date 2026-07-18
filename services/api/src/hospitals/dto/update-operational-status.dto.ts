import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateOperationalStatusDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  availableBeds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalBeds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableIcu?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalIcu?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableDoctors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalDoctors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  emergencyLoad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  queueLoad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ventilatorsAvailable?: number;
}
