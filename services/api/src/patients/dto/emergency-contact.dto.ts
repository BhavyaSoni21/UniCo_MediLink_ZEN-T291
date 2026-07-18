import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class EmergencyContactDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  relationship?: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
