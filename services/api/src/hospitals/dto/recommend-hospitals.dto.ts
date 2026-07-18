import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class RecommendHospitalsDto {
  @IsOptional()
  @IsUUID()
  triageSessionId?: string;

  @IsOptional()
  @IsInt()
  requiredSpecializationId?: number;

  @IsOptional()
  @IsNumber()
  patientLat?: number;

  @IsOptional()
  @IsNumber()
  patientLng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxResults?: number;
}
