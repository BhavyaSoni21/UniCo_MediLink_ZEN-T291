import { IsDateString } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  appointmentDate: string;
}
