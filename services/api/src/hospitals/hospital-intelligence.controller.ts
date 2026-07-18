import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { VerifiedTokenPayload } from '../auth/token-verifier';
import { HospitalsService } from './hospitals.service';
import { RecommendHospitalsDto } from './dto/recommend-hospitals.dto';

@Controller('hospital-intelligence')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Patient)
export class HospitalIntelligenceController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post('recommend')
  recommend(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: RecommendHospitalsDto,
  ) {
    return this.hospitalsService.recommend(user.sub, dto);
  }

  @Get('explanations/:recommendationId')
  getExplanation(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('recommendationId') recommendationId: string,
  ) {
    return this.hospitalsService.getExplanation(user.sub, recommendationId);
  }

  @Get('sessions/:sessionId/recommendations')
  getRecommendationsForSession(
    @CurrentUser() user: VerifiedTokenPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.hospitalsService.getRecommendationsForSession(user.sub, sessionId);
  }
}
