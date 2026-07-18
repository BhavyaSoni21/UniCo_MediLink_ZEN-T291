import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import type { appointment_status_enum } from '../../generated/prisma/enums';

@Controller('appointments')
@UseGuards(AuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('availability')
  @Roles(UserRole.Patient)
  getAvailability(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailability(doctorId, date);
  }

  @Post()
  @Roles(UserRole.Patient)
  book(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: BookAppointmentDto,
  ) {
    return this.appointmentsService.book(user.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.Patient)
  getMine(@CurrentUser() user: VerifiedTokenPayload) {
    return this.appointmentsService.getForPatient(user.sub);
  }

  @Get('doctor/me')
  @Roles(UserRole.Doctor)
  getMineAsDoctor(@CurrentUser() user: VerifiedTokenPayload) {
    return this.appointmentsService.getForDoctor(user.sub);
  }

  @Get(':appointmentId')
  @Roles(UserRole.Patient, UserRole.Doctor)
  getById(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.appointmentsService.getById(user.sub, appointmentId);
  }

  @Patch(':appointmentId')
  @Roles(UserRole.Patient)
  reschedule(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(user.sub, appointmentId, dto);
  }

  @Patch(':appointmentId/status')
  @Roles(UserRole.Doctor)
  updateStatus(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      user.sub,
      appointmentId,
      dto.status as appointment_status_enum,
    );
  }

  @Post(':appointmentId/cancel')
  @Roles(UserRole.Patient, UserRole.Doctor)
  cancel(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.appointmentsService.cancel(user.sub, appointmentId);
  }

  @Get(':appointmentId/queue-status')
  @Roles(UserRole.Patient, UserRole.Doctor)
  getQueueStatus(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.appointmentsService.getQueueStatusForAppointment(
      user.sub,
      appointmentId,
    );
  }
}
