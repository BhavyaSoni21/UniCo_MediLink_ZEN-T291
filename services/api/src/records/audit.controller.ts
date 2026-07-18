import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { RecordsService } from './records.service';

@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Patient)
export class AuditController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get('record-access')
  getAuditLog(@CurrentUser() user: VerifiedTokenPayload) {
    return this.recordsService.getAuditLog(user.sub);
  }
}
