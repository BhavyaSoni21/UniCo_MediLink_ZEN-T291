import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import type { VerifiedTokenPayload } from './token-verifier';

@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('complete-profile')
  async completeProfile(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: CompleteProfileDto,
  ) {
    const dbUser = await this.authService.completeProfile(user, dto.role);
    return toUserResponse(dbUser);
  }

  @Get('me')
  async me(@CurrentUser() user: VerifiedTokenPayload) {
    const dbUser = await this.authService.getMe(user.sub);
    return toUserResponse(dbUser);
  }
}

function toUserResponse(user: {
  id: string;
  email: string | null;
  account_status: string;
  created_at: Date;
  roles: { role_name: string };
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.roles.role_name,
    accountStatus: user.account_status,
    createdAt: user.created_at,
  };
}
