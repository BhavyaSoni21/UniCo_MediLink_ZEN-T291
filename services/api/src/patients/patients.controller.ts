import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { PatientsService } from './patients.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { UpdateAllergiesDto } from './dto/update-allergies.dto';
import { UpdateMedicationsDto } from './dto/update-medications.dto';

@Controller('patients')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Patient)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('me')
  getMe(@CurrentUser() user: VerifiedTokenPayload) {
    return this.patientsService.getMe(user.sub);
  }

  @Put('me')
  updateMe(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.patientsService.updateMe(user.sub, dto);
  }

  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadPhoto(
    @CurrentUser() user: VerifiedTokenPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.patientsService.updatePhoto(user.sub, file);
  }

  @Get('medical-history')
  getMedicalHistory(@CurrentUser() user: VerifiedTokenPayload) {
    return this.patientsService.getMedicalHistory(user.sub);
  }

  @Put('medical-history')
  updateMedicalHistory(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UpdateMedicalHistoryDto,
  ) {
    return this.patientsService.updateMedicalHistory(user.sub, dto);
  }

  @Get('allergies')
  getAllergies(@CurrentUser() user: VerifiedTokenPayload) {
    return this.patientsService.getAllergies(user.sub);
  }

  @Put('allergies')
  updateAllergies(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UpdateAllergiesDto,
  ) {
    return this.patientsService.updateAllergies(user.sub, dto);
  }

  @Get('medications')
  getMedications(@CurrentUser() user: VerifiedTokenPayload) {
    return this.patientsService.getMedications(user.sub);
  }

  @Put('medications')
  updateMedications(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UpdateMedicationsDto,
  ) {
    return this.patientsService.updateMedications(user.sub, dto);
  }

  @Get('timeline')
  getTimeline(@CurrentUser() user: VerifiedTokenPayload) {
    return this.patientsService.getTimeline(user.sub);
  }
}
