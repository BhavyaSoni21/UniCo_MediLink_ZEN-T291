import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { NeonJwksTokenVerifier, TOKEN_VERIFIER } from './token-verifier';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    { provide: TOKEN_VERIFIER, useClass: NeonJwksTokenVerifier },
  ],
  exports: [AuthGuard, RolesGuard, TOKEN_VERIFIER],
})
export class AuthModule {}
