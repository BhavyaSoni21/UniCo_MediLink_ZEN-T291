import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { compare, hash } from 'bcrypt';
import type { VerifiedTokenPayload } from './token-verifier';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signUp(email: string, password: string, name: string) {
    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const passwordHash = await hash(password, 10);

    // role_id is intentionally left unset — the dashboard sends the user
    // through RoleForm (POST /auth/complete-profile) to pick one after
    // their first login.
    const user = await this.prisma.users.create({
      data: {
        email,
        name,
        password_hash: passwordHash,
        is_email_verified: true,
      },
    });

    return { id: user.id, email: user.email, name: user.name };
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    return { id: user.id, email: user.email, name: user.name };
  }

  async completeProfile(token: VerifiedTokenPayload, role: UserRole) {
    if (!token.email) {
      throw new BadRequestException('Token is missing an email claim');
    }

    const dbRole = await this.prisma.roles.findUnique({
      where: { role_name: role },
    });
    if (!dbRole) {
      throw new BadRequestException(`Unknown role: ${role}`);
    }

    const user = await this.prisma.users.update({
      where: { id: token.sub },
      data: { role_id: dbRole.id },
      include: { roles: true },
    });

    if (role === UserRole.Patient) {
      await this.prisma.patients.upsert({
        where: { user_id: token.sub },
        update: {},
        create: { user_id: token.sub },
      });
    }

    return user;
  }

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user || !user.roles) {
      throw new NotFoundException(
        'No MediLink profile yet — call complete-profile first',
      );
    }
    return user;
  }
}
