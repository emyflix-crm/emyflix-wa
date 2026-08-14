import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
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
        throw new BadRequestException('Este email já está em uso');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...(dto.name && { name: dto.name }), ...(dto.email && { email: dto.email }) },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Senha atual incorreta');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Senha alterada com sucesso' };
  }

  async getTrialInfo(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const now = new Date();
    const daysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    return { trialEndsAt: user.trialEndsAt, daysLeft, isTrialActive: user.isTrialActive };
  }

  async getUserStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [messagesSentToday, activeCampaigns, connectedInstances] = await Promise.all([
      this.prisma.messageHistory.count({ where: { userId, sentAt: { gte: today }, status: 'SENT' } }),
      this.prisma.campaign.count({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.whatsAppInstance.count({ where: { userId, status: 'CONNECTED' } }),
    ]);

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
    });

    const dailyUsage = await this.prisma.dailyUsage.findFirst({ where: { userId, date: { gte: today } } });

    return {
      messagesSentToday,
      activeCampaigns,
      connectedInstances,
      dailyLimit: subscription?.plan?.maxMessagesPerDay || 0,
      dailyUsed: dailyUsage?.messagesCount || 0,
      plan: subscription?.plan?.name || 'Sem plano',
    };
  }
}
