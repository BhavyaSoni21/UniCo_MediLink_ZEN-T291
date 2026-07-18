import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { appointment_type_enum } from '../../../generated/prisma/enums';

export class BookAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsDateString()
  appointmentDate: string;

  @IsOptional()
  @IsIn(Object.values(appointment_type_enum))
  appointmentType?: string;

  @IsOptional()
  @IsUUID()
  triageSessionId?: string;
}
