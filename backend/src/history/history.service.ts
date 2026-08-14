import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getUserHistory(userId: string, filters: any = {}) {
    const { dateFrom, dateTo, status, page = 1, limit = 20 } = filters;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.sentAt = {};
      if (dateFrom) where.sentAt.gte = new Date(dateFrom);
      if (dateTo) where.sentAt.lte = new Date(dateTo);
    }

    const [history, total] = await Promise.all([
      this.prisma.messageHistory.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.messageHistory.count({ where }),
    ]);

    return { history, total, page: Number(page), limit: Number(limit) };
  }

  async getUserStats(userId: string, filters: any = {}) {
    const { dateFrom, dateTo } = filters;
    const where: any = { userId };
    if (dateFrom || dateTo) {
      where.sentAt = {};
      if (dateFrom) where.sentAt.gte = new Date(dateFrom);
      if (dateTo) where.sentAt.lte = new Date(dateTo);
    }

    const [sent, failed, pending] = await Promise.all([
      this.prisma.messageHistory.count({ where: { ...where, status: 'SENT' } }),
      this.prisma.messageHistory.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.messageHistory.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    return { sent, failed, pending };
  }

  async getDailyUsage(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.dailyUsage.findFirst({
      where: { userId, date: { gte: today } },
    });

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
    });

    const limit = subscription?.plan?.maxMessagesPerDay || 0;
    const used = usage?.messagesCount || 0;

    return {
      used,
      limit,
      percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
    };
  }
}
