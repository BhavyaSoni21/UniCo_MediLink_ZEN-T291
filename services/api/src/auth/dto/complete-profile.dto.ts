import { IsIn } from 'class-validator';
import { UserRole } from '@medilink/shared-types';

export class CompleteProfileDto {
  @IsIn(Object.values(UserRole))
  role: UserRole;
}
