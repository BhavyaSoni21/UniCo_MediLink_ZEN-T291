import { IsIn, IsUUID } from 'class-validator';
import { consent_grantee_type_enum } from '../../../generated/prisma/enums';

export class ShareRecordDto {
  @IsIn(Object.values(consent_grantee_type_enum))
  grantedToType: string;

  @IsUUID()
  grantedToId: string;
}
