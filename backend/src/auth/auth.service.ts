import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const payload = { email: user.email, userId: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    
    const refreshTokenValue = uuidv4();
    const expiresAt = dayjs().add(7, 'day').toDate();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email já está em uso');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const trialEndsAt = dayjs().add(7, 'day').toDate();
    const firstPlan = await this.prisma.plan.findFirst({ orderBy: { sortOrder: 'asc' } });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
        trialEndsAt,
        isTrialActive: true,
      },
    });

    if (firstPlan) {
      await this.prisma.subscription.create({
        data: {
          userId: user.id,
          planId: firstPlan.id,
          status: 'TRIAL',
          billingCycle: 'MONTHLY',
          startsAt: new Date(),
          endsAt: trialEndsAt,
        },
      });
    }

    return { message: 'Cadastro realizado com sucesso!' };
  }

  async logout(userId: string, token: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token,
      },
    });
    return { message: 'Logged out successfully' };
  }

  async refreshToken(token: string) {
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = { email: refreshTokenRecord.user.email, userId: refreshTokenRecord.user.id, role: refreshTokenRecord.user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const trialEndsAt = dayjs().add(7, 'day').toDate();
    const firstPlan = await this.prisma.plan.findFirst({ orderBy: { sortOrder: 'asc' } });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          status: 'ACTIVE',
          trialEndsAt,
          isTrialActive: true,
        },
      }),
      ...(firstPlan ? [this.prisma.subscription.create({
        data: {
          userId: user.id,
          planId: firstPlan.id,
          status: 'TRIAL',
          billingCycle: 'MONTHLY',
          startsAt: new Date(),
          endsAt: trialEndsAt,
        },
      })] : [])
    ]);

    await this.emailService.sendWelcomeEmail(user.email, user.name);

    return { message: 'Email verified successfully. Trial activated.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If the email exists, a reset link was sent.' };

    const token = uuidv4();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: dayjs().add(1, 'hour').toDate(),
      },
    });

    const baseUrl = this.configService.get('FRONTEND_URL');
    await this.emailService.sendPasswordResetEmail(user.email, user.name, token, baseUrl);

    return { message: 'If the email exists, a reset link was sent.' };
  }

  async resetPassword(token: string, pass: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(pass, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        isTrialActive: true,
        trialEndsAt: true,
        createdAt: true,
        subscriptions: {
          where: {
            status: { in: ['ACTIVE', 'TRIAL'] }
          },
          include: {
            plan: true
          }
        }
      }
    });
    return user;
  }
}
