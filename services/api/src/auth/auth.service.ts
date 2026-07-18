import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@medilink/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { VerifiedTokenPayload } from './token-verifier';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.users.upsert({
      where: { id: token.sub },
      update: { email: token.email },
      create: { id: token.sub, email: token.email, role_id: dbRole.id },
      include: { roles: true },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) {
      throw new NotFoundException(
        'No MediLink profile yet — call complete-profile first',
      );
    }
    return user;
  }
}
