import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard, extractBearerToken } from './auth.guard';
import type { TokenVerifier, VerifiedTokenPayload } from './token-verifier';

function contextWithAuthHeader(header: string | undefined): {
  context: ExecutionContext;
  request: { headers: { authorization?: string }; user?: VerifiedTokenPayload };
} {
  const request: {
    headers: { authorization?: string };
    user?: VerifiedTokenPayload;
  } = {
    headers: { authorization: header },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('extractBearerToken', () => {
  it('extracts the token from a well-formed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('returns null for a missing header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(extractBearerToken('Basic abc')).toBeNull();
  });
});

describe('AuthGuard', () => {
  it('attaches the verified payload to the request on success', async () => {
    const payload: VerifiedTokenPayload = {
      sub: 'user-1',
      email: 'a@example.com',
    };
    const verifier: TokenVerifier = {
      verify: jest.fn().mockResolvedValue(payload),
    };
    const guard = new AuthGuard(verifier);
    const { context, request } = contextWithAuthHeader('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
    expect(verifier.verify).toHaveBeenCalledWith('valid-token');
  });

  it('throws UnauthorizedException when no Authorization header is present', async () => {
    const verifier: TokenVerifier = { verify: jest.fn() };
    const guard = new AuthGuard(verifier);
    const { context } = contextWithAuthHeader(undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when verification fails', async () => {
    const verifier: TokenVerifier = {
      verify: jest.fn().mockRejectedValue(new Error('bad signature')),
    };
    const guard = new AuthGuard(verifier);
    const { context } = contextWithAuthHeader('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
