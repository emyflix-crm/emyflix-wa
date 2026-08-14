import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserHistory(
    userId: string,
    filters: { dateFrom?: string; dateTo?: string; status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page ? +filters.page : 1;
    const limit = filters.limit ? +filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.messageHistory.findMany({
        where,
        skip,
        take: limit,
        include: {
          campaign: { select: { name: true } },
          group: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.messageHistory.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUserStats(userId: string, filters: { dateFrom?: string; dateTo?: string }) {
    const where: any = { userId };
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [sent, failed] = await Promise.all([
      this.prisma.messageHistory.count({ where: { ...where, status: 'SENT' } }),
      this.prisma.messageHistory.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    // For pending, we look at campaignGroup
    const pendingWhere: any = { campaign: { userId }, status: 'PENDING' };
    if (filters.dateFrom || filters.dateTo) {
      pendingWhere.scheduledAt = {};
      if (filters.dateFrom) pendingWhere.scheduledAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) pendingWhere.scheduledAt.lte = new Date(filters.dateTo);
    }

    const pending = await this.prisma.campaignGroup.count({
      where: pendingWhere,
    });

    return { sent, failed, pending };
  }

  async getDailyUsage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user || !user.subscription || !user.subscription.plan) {
      return { used: 0, limit: 0, percentage: 0 };
    }

    const limit = user.subscription.plan.maxMessagesPerDay;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyUsage = await this.prisma.dailyUsage.findFirst({
      where: { userId, date: today },
    });

    const used = dailyUsage?.messagesCount || 0;
    const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

    return { used, limit, percentage };
  }
}
