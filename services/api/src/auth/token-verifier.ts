import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export interface VerifiedTokenPayload {
  sub: string;
  email?: string;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedTokenPayload>;
  sign(payload: { sub: string; email?: string }): string;
}

@Injectable()
export class LocalTokenVerifier implements TokenVerifier {
  private readonly secret: string;

  constructor() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error('AUTH_SECRET is not configured');
    }
    this.secret = secret;
  }

  async verify(token: string): Promise<VerifiedTokenPayload> {
    const payload = jwt.verify(token, this.secret) as { sub: string; email?: string };
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('Token payload is missing `sub`');
    }
    return { sub: payload.sub, email: payload.email };
  }

  sign(payload: { sub: string; email?: string }): string {
    return jwt.sign(payload, this.secret, { expiresIn: '7d' });
  }
}
