import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface VerifiedTokenPayload {
  /** Neon Auth's external user id (JWT `sub` claim). */
  sub: string;
  email?: string;
  emailVerified?: boolean;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedTokenPayload>;
}

@Injectable()
export class NeonJwksTokenVerifier implements TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const jwksUrl = process.env.JWKS_URL;
    if (!jwksUrl) {
      throw new Error('JWKS_URL is not configured');
    }
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async verify(token: string): Promise<VerifiedTokenPayload> {
    const { payload } = await jwtVerify(token, this.jwks);
    return toVerifiedPayload(payload);
  }
}

export function toVerifiedPayload(payload: JWTPayload): VerifiedTokenPayload {
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Token payload is missing `sub`');
  }
  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    emailVerified:
      typeof payload.emailVerified === 'boolean'
        ? payload.emailVerified
        : undefined,
  };
}
