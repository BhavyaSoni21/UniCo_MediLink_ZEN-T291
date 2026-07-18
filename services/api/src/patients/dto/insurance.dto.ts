import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class InsuranceDto {
  @IsString()
  @MaxLength(255)
  providerName: string;

  @IsString()
  @MaxLength(100)
  policyNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coverageType?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
