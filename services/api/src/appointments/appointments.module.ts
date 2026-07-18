import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { AppointmentsController } from './appointments.controller';
import { QueueController } from './queue.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [AuthModule, PatientsModule, DoctorsModule],
  controllers: [AppointmentsController, QueueController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
