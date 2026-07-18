import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@medilink/shared-types';
import { RolesGuard } from './roles.guard';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './auth.guard';

function contextForUser(sub: string): ExecutionContext {
  const request = { user: { sub } } as AuthenticatedRequest;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no @Roles metadata is set', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const prisma = {
      users: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const guard = new RolesGuard(reflector, prisma);

    await expect(guard.canActivate(contextForUser('user-1'))).resolves.toBe(
      true,
    );
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('allows access when the local user has a required role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const prisma = {
      users: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', roles: { role_name: 'admin' } }),
      },
    } as unknown as PrismaService;
    const guard = new RolesGuard(reflector, prisma);

    await expect(guard.canActivate(contextForUser('user-1'))).resolves.toBe(
      true,
    );
  });

  it('denies access when the local user has a different role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const prisma = {
      users: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', roles: { role_name: 'patient' } }),
      },
    } as unknown as PrismaService;
    const guard = new RolesGuard(reflector, prisma);

    await expect(
      guard.canActivate(contextForUser('user-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies access when the caller has no local profile yet', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const prisma = {
      users: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const guard = new RolesGuard(reflector, prisma);

    await expect(
      guard.canActivate(contextForUser('user-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
