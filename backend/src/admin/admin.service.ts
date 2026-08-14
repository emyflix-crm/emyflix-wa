import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const totalUsers = await this.prisma.user.count({
      where: { role: 'USER' },
    });

    const activeUsers = await this.prisma.user.count({
      where: { role: 'USER', subscription: { status: 'ACTIVE' } },
    });

    const trialUsers = await this.prisma.user.count({
      where: { role: 'USER', subscription: { status: 'TRIAL' } },
    });

    const expiredUsers = await this.prisma.user.count({
      where: { role: 'USER', subscription: { status: { in: ['EXPIRED', 'CANCELLED'] } } },
    });

    const totalMessagesSent = await this.prisma.messageHistory.count({
      where: { status: 'SENT' },
    });

    const connectedInstances = await this.prisma.whatsAppInstance.count({
      where: { status: 'CONNECTED' },
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const monthlyRevenue = activeSubscriptions.reduce((acc, sub) => {
      // Simplification assuming monthly billing
      return acc + (sub.plan?.price || 0);
    }, 0);

    const newUsersThisMonth = await this.prisma.user.count({
      where: {
        role: 'USER',
        createdAt: { gte: firstDayOfMonth },
      },
    });

    return {
      totalUsers,
      activeUsers,
      trialUsers,
      expiredUsers,
      totalMessagesSent,
      connectedInstances,
      monthlyRevenue,
      newUsersThisMonth,
    };
  }

  async getUsers(filters: { search?: string; status?: string; planId?: string; page?: number; limit?: number }) {
    const page = filters.page ? +filters.page : 1;
    const limit = filters.limit ? +filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = { role: 'USER' };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      if (filters.status === 'BLOCKED') {
        where.status = 'BLOCKED';
      } else {
        where.subscription = { status: filters.status };
      }
    }

    if (filters.planId) {
      where.subscription = { ...where.subscription, planId: filters.planId };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          subscription: { include: { plan: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: { include: { plan: true } },
        instances: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.dailyUsage.findFirst({
      where: { userId, date: today },
    });

    const campaignCount = await this.prisma.campaign.count({
      where: { userId },
    });

    return {
      ...user,
      todayUsage: usage?.messagesCount || 0,
      campaignCount,
    };
  }

  async updateUser(userId: string, dto: { name?: string; email?: string; status?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async blockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'BLOCKED' },
    });
  }

  async unblockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async activateTrial(userId: string, days: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    await this.prisma.user.update({
      where: { id: userId },
      data: { isTrialActive: true, trialEndsAt },
    });

    const defaultPlan = await this.prisma.plan.findFirst();

    return this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: defaultPlan?.id || '',
        status: 'TRIAL',
        billingCycle: 'MONTHLY',
        startsAt: new Date(),
        endsAt: trialEndsAt,
      },
      update: {
        status: 'TRIAL',
        endsAt: trialEndsAt,
      },
    });
  }

  async changePlan(userId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        planId,
        status: 'ACTIVE',
      },
    });
  }
}
