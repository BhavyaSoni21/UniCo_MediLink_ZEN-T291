import { IsUUID } from 'class-validator';

export class RevokeConsentDto {
  @IsUUID()
  consentId: string;
}
