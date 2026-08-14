import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const totalUsers = await this.prisma.user.count({ where: { role: 'USER' } });
    
    const activeSubscriptions = await this.prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const trialSubscriptions = await this.prisma.subscription.count({ where: { status: 'TRIAL' } });
    const expiredSubscriptions = await this.prisma.subscription.count({ where: { status: { in: ['EXPIRED', 'CANCELLED'] } } });
    
    const totalMessagesSent = await this.prisma.messageHistory.count({ where: { status: 'SENT' } });
    const connectedInstances = await this.prisma.whatsAppInstance.count({ where: { status: 'CONNECTED' } });
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const newUsersThisMonth = await this.prisma.user.count({
      where: { role: 'USER', createdAt: { gte: startOfMonth } },
    });

    const activeSubscriptionList = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });
    
    const monthlyRevenue = activeSubscriptionList.reduce((acc, sub) => {
      return acc + Number(sub.plan?.price || 0);
    }, 0);

    return {
      totalUsers,
      activeUsers: activeSubscriptions,
      trialUsers: trialSubscriptions,
      expiredUsers: expiredSubscriptions,
      totalMessagesSent,
      connectedInstances,
      monthlyRevenue,
      yearlyRevenue: monthlyRevenue * 12,
      newUsersThisMonth,
    };
  }

  async getUsers(filters: any = {}) {
    const { search, status, planId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { role: 'USER' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page: Number(page), limit: Number(limit) };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        whatsAppInstances: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyUsage = await this.prisma.dailyUsage.findFirst({
      where: { userId, date: { gte: today } },
    });

    const campaignCount = await this.prisma.campaign.count({ where: { userId, status: 'ACTIVE' } });

    return { ...user, dailyUsage, campaignCount };
  }

  async updateUser(userId: string, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.status && { status: dto.status as any }),
      },
    });
  }

  async blockUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'BLOCKED' as any } });
  }

  async unblockUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' as any } });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

  async activateTrial(userId: string, days: number) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    await this.prisma.user.update({
      where: { id: userId },
      data: { trialEndsAt, isTrialActive: true },
    });

    const firstPlan = await this.prisma.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    
    if (firstPlan) {
      const existing = await this.prisma.subscription.findFirst({ where: { userId } });
      if (existing) {
        await this.prisma.subscription.update({
          where: { id: existing.id },
          data: { status: 'TRIAL' as any, endsAt: trialEndsAt, planId: firstPlan.id },
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            userId,
            planId: firstPlan.id,
            status: 'TRIAL' as any,
            billingCycle: 'MONTHLY' as any,
            startsAt: new Date(),
            endsAt: trialEndsAt,
          },
        });
      }
    }

    return { message: `Trial de ${days} dias ativado com sucesso` };
  }

  async changePlan(userId: string, planId: string) {
    const existing = await this.prisma.subscription.findFirst({ where: { userId } });
    if (existing) {
      return this.prisma.subscription.update({
        where: { id: existing.id },
        data: { planId, status: 'ACTIVE' as any },
      });
    }
    return this.prisma.subscription.create({
      data: {
        userId, planId,
        status: 'ACTIVE' as any,
        billingCycle: 'MONTHLY' as any,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
