import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(onlyActive = true) {
    return this.prisma.plan.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        maxMessagesPerDay: dto.maxMessagesPerDay,
        maxGroups: dto.maxGroups,
        maxCampaigns: dto.maxCampaigns,
        maxInstances: dto.maxInstances,
        features: dto.features,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findById(id);
    return this.prisma.plan.update({ where: { id }, data: dto as any });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.plan.delete({ where: { id } });
  }

  async checkUserLimit(userId: string, limitType: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
    });
    if (!subscription) return { allowed: false, reason: 'Sem assinatura ativa' };

    const plan = subscription.plan;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (limitType === 'messages') {
      const usage = await this.prisma.dailyUsage.findFirst({ where: { userId, date: { gte: today } } });
      const used = usage?.messagesCount || 0;
      return { allowed: used < plan.maxMessagesPerDay, used, limit: plan.maxMessagesPerDay };
    }

    if (limitType === 'campaigns') {
      const count = await this.prisma.campaign.count({ where: { userId, status: 'ACTIVE' } });
      return { allowed: count < plan.maxCampaigns, used: count, limit: plan.maxCampaigns };
    }

    if (limitType === 'instances') {
      const count = await this.prisma.whatsAppInstance.count({ where: { userId } });
      return { allowed: count < plan.maxInstances, used: count, limit: plan.maxInstances };
    }

    return { allowed: true };
  }
}
