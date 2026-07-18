import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { TOKEN_VERIFIER } from './token-verifier';
import type { TokenVerifier, VerifiedTokenPayload } from './token-verifier';
import { Inject } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
  ) {}

  @Post('sign-up')
  async signUp(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
  ) {
    const user = await this.authService.signUp(email, password, name);
    const token = this.tokenVerifier.sign({ sub: user.id, email: user.email ?? undefined });
    return { user, token };
  }

  @Post('sign-in')
  async signIn(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    const user = await this.authService.signIn(email, password);
    const token = this.tokenVerifier.sign({ sub: user.id, email: user.email ?? undefined });
    return { user, token };
  }

  @Post('complete-profile')
  @UseGuards(AuthGuard)
  async completeProfile(
    @CurrentUser() user: VerifiedTokenPayload,
    @Body() dto: CompleteProfileDto,
  ) {
    const dbUser = await this.authService.completeProfile(user, dto.role);
    return toUserResponse(dbUser);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: VerifiedTokenPayload) {
    const dbUser = await this.authService.getMe(user.sub);
    return toUserResponse(dbUser);
  }

  // Token-validity check only — no DB lookup, no dependency on the user
  // having picked a role yet. /auth/me 404s until complete-profile has run,
  // which is the *correct* signal for "show RoleForm", but the frontend
  // also needs a way to tell "no valid session" apart from "valid session,
  // profile incomplete" without conflating the two. This endpoint is that
  // signal; /auth/me remains the profile-completeness check.
  @Get('session')
  @UseGuards(AuthGuard)
  session(@CurrentUser() user: VerifiedTokenPayload) {
    return { id: user.sub, email: user.email ?? null };
  }
}

function toUserResponse(user: {
  id: string;
  email: string | null;
  account_status: string;
  created_at: Date;
  roles: { role_name: string } | null;
}) {
  // getMe/completeProfile both guarantee roles is set by the time a user
  // reaches here (getMe throws NotFoundException otherwise, and
  // completeProfile just set role_id in the same update) — this is a type
  // narrowing assertion, not an expected runtime path.
  if (!user.roles) {
    throw new Error('toUserResponse called with a user that has no role assigned');
  }
  return {
    id: user.id,
    email: user.email,
    role: user.roles.role_name,
    accountStatus: user.account_status,
    createdAt: user.created_at,
  };
}
