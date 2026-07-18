import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { TriageService } from './triage.service';
import { SubmitSymptomsDto } from './dto/submit-symptoms.dto';
import { SubmitVitalsDto } from './dto/submit-vitals.dto';

@Controller('triage')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Patient)
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post('sessions')
  startSession(@CurrentUser() user: VerifiedTokenPayload) {
    return this.triageService.startSession(user.sub);
  }

  @Post('sessions/:sessionId/symptoms')
  submitSymptoms(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitSymptomsDto,
  ) {
    return this.triageService.submitSymptoms(user.sub, sessionId, dto);
  }

  @Post('sessions/:sessionId/vitals')
  submitVitals(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitVitalsDto,
  ) {
    return this.triageService.submitVitals(user.sub, sessionId, dto);
  }

  @Post('sessions/:sessionId/evaluate')
  evaluate(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.triageService.evaluate(user.sub, sessionId);
  }

  @Get('sessions/:sessionId')
  getSession(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.triageService.getSession(user.sub, sessionId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: VerifiedTokenPayload) {
    return this.triageService.getHistory(user.sub);
  }
}
