import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { DoctorsService } from './doctors.service';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('doctors')
@UseGuards(AuthGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('search')
  search(
    @Query('specializationId') specializationId?: string,
    @Query('hospitalId') hospitalId?: string,
  ) {
    return this.doctorsService.search(
      specializationId ? Number(specializationId) : undefined,
      hospitalId,
    );
  }

  @Get('specializations')
  listSpecializations() {
    return this.doctorsService.listSpecializations();
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Doctor)
  getMe(@CurrentUser() user: VerifiedTokenPayload) {
    return this.doctorsService.getMe(user.sub);
  }

  @Put('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Doctor)
  updateMe(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorsService.updateMe(user.sub, dto);
  }

  @Put('me/schedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Doctor)
  updateSchedule(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.doctorsService.updateSchedule(user.sub, dto);
  }

  @Get(':doctorId')
  getById(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getById(doctorId);
  }
}
