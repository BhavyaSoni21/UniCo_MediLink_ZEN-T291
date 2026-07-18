import { IsIn } from 'class-validator';
import { appointment_status_enum } from '../../../generated/prisma/enums';

export class UpdateAppointmentStatusDto {
  @IsIn(Object.values(appointment_status_enum))
  status: string;
}
