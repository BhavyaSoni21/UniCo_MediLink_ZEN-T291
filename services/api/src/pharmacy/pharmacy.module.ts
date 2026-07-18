import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { PharmacyController } from './pharmacy.controller';
import { ReservationsController } from './reservations.controller';
import { PharmacyService } from './pharmacy.service';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [PharmacyController, ReservationsController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
