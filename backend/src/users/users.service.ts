import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(userId: string, dto: { name?: string; email?: string }) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Invalid current password');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
  }

  async getTrialInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trialEndsAt: true, isTrialActive: true }
    });

    if (!user) throw new BadRequestException('User not found');

    let daysLeft = 0;
    if (user.trialEndsAt && user.isTrialActive) {
      daysLeft = dayjs(user.trialEndsAt).diff(dayjs(), 'day');
      if (daysLeft < 0) daysLeft = 0;
    }

    return {
      isTrialActive: user.isTrialActive && daysLeft > 0,
      trialEndsAt: user.trialEndsAt,
      daysLeft,
    };
  }

  async getUserStats(userId: string) {
    const today = dayjs().startOf('day').toDate();

    const [dailyUsage, campaignsCount, instancesCount] = await Promise.all([
      this.prisma.dailyUsage.findUnique({
        where: { userId_date: { userId, date: today } }
      }),
      this.prisma.campaign.count({
        where: { userId, status: 'ACTIVE' }
      }),
      this.prisma.whatsappInstance.count({
        where: { userId, status: 'CONNECTED' }
      })
    ]);

    return {
      messagesToday: dailyUsage?.messagesCount || 0,
      activeCampaigns: campaignsCount,
      connectedInstances: instancesCount,
    };
  }
}
