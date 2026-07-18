import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { RecordsModule } from './records/records.module';
import { TriageModule } from './triage/triage.module';
import { HospitalsModule } from './hospitals/hospitals.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    PatientsModule,
    RecordsModule,
    TriageModule,
    HospitalsModule,
  ],
})
export class AppModule {}
