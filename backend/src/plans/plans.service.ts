import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import dayjs from 'dayjs';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(onlyActive: boolean = true) {
    return this.prisma.plan.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Plan with this slug already exists');

    return this.prisma.plan.create({
      data: {
        ...dto,
      },
    });
  }

  async update(id: string, dto: Partial<CreatePlanDto>) {
    await this.findById(id);
    return this.prisma.plan.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.plan.delete({ where: { id } });
  }

  async checkUserLimit(userId: string, limitType: 'messages' | 'groups' | 'campaigns' | 'instances') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
          orderBy: { startsAt: 'desc' },
          take: 1,
        }
      }
    });

    if (!user || user.subscriptions.length === 0) {
      throw new BadRequestException('No active subscription found');
    }

    const plan = user.subscriptions[0].plan;

    switch (limitType) {
      case 'messages':
        const today = dayjs().startOf('day').toDate();
        const usage = await this.prisma.dailyUsage.findUnique({
          where: { userId_date: { userId, date: today } }
        });
        if (usage && usage.messagesCount >= plan.maxMessagesPerDay) {
          throw new BadRequestException('Daily message limit exceeded');
        }
        return true;
      case 'groups':
        // Implement group count check if needed
        return true;
      case 'campaigns':
        const campaigns = await this.prisma.campaign.count({ where: { userId, status: 'ACTIVE' } });
        if (campaigns >= plan.maxCampaigns) {
          throw new BadRequestException('Active campaigns limit exceeded');
        }
        return true;
      case 'instances':
        const instances = await this.prisma.whatsappInstance.count({ where: { userId } });
        if (instances >= plan.maxInstances) {
          throw new BadRequestException('WhatsApp instances limit exceeded');
        }
        return true;
    }
  }
}
