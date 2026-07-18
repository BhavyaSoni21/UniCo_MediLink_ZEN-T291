import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { ConsentsService } from './consents.service';
import { GrantConsentDto } from './dto/grant-consent.dto';
import { RevokeConsentDto } from './dto/revoke-consent.dto';

@Controller('consents')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Patient)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post('grant')
  grant(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: GrantConsentDto,
  ) {
    return this.consentsService.grant(user.sub, dto);
  }

  @Post('revoke')
  revoke(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: RevokeConsentDto,
  ) {
    return this.consentsService.revoke(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: VerifiedTokenPayload) {
    return this.consentsService.list(user.sub);
  }
}
