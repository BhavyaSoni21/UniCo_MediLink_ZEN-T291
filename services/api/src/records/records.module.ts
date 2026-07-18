import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [RecordsController, ConsentsController, AuditController],
  providers: [RecordsService, ConsentsService],
  exports: [RecordsService, ConsentsService],
})
export class RecordsModule {}
