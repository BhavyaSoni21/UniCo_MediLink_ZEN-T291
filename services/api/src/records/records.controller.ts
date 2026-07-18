import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import { RecordsService } from './records.service';
import { UploadRecordDto } from './dto/upload-record.dto';
import { ShareRecordDto } from './dto/share-record.dto';

@Controller('records')
@UseGuards(AuthGuard, RolesGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post('upload')
  @Roles(UserRole.Patient)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  upload(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: UploadRecordDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.recordsService.upload(user.sub, dto, file);
  }

  // Any authenticated role may reach these two — access is resolved inside
  // the service (owner or active consent), not by role.
  @Get('patient/:patientId')
  listForPatient(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('patientId') patientId: string,
  ) {
    return this.recordsService.listForPatient(user.sub, patientId);
  }

  @Get(':recordId')
  getById(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('recordId') recordId: string,
  ) {
    return this.recordsService.getById(user.sub, recordId);
  }

  @Delete(':recordId')
  @Roles(UserRole.Patient)
  delete(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('recordId') recordId: string,
  ) {
    return this.recordsService.delete(user.sub, recordId);
  }

  @Post(':recordId/share')
  @Roles(UserRole.Patient)
  share(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('recordId') recordId: string,
    @Body() dto: ShareRecordDto,
  ) {
    return this.recordsService.share(user.sub, recordId, dto);
  }
}
