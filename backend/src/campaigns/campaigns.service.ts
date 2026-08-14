import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('message-queue') private messageQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateCampaignDto) {
    // Validate instance belongs to user
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id: dto.instanceId, userId },
    });
    if (!instance) throw new BadRequestException('Instância não encontrada');
    if (instance.status !== 'CONNECTED') throw new BadRequestException('WhatsApp não está conectado');

    // Validate subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
    });
    if (!subscription) throw new BadRequestException('Assinatura inativa ou expirada');
    if (subscription.endsAt && subscription.endsAt < new Date()) {
      throw new BadRequestException('Assinatura expirada');
    }

    const plan = subscription.plan;

    // Check groups limit
    if (dto.groupIds.length > plan.maxGroups) {
      throw new BadRequestException(`Seu plano permite no máximo ${plan.maxGroups} grupos por campanha`);
    }

    // Check campaigns limit
    const activeCampaigns = await this.prisma.campaign.count({ where: { userId, status: 'ACTIVE' } });
    if (activeCampaigns >= plan.maxCampaigns) {
      throw new BadRequestException(`Limite de ${plan.maxCampaigns} campanhas ativas atingido`);
    }

    // Check daily usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usage = await this.prisma.dailyUsage.findFirst({ where: { userId, date: { gte: today } } });
    const currentUsage = usage?.messagesCount || 0;
    if (currentUsage + dto.groupIds.length > plan.maxMessagesPerDay) {
      throw new BadRequestException(`Limite diário de ${plan.maxMessagesPerDay} mensagens seria excedido`);
    }

    // Create campaign
    const scheduledAt = new Date(dto.scheduledAt);
    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        instanceId: dto.instanceId,
        name: dto.name,
        message: dto.message,
        mediaUrl: dto.mediaUrl,
        mediaType: (dto.mediaType || 'TEXT') as any,
        recurrenceType: dto.recurrenceType as any,
        recurrenceDays: dto.recurrenceDays as any,
        recurrenceDay: dto.recurrenceDay,
        timezone: dto.timezone || 'America/Sao_Paulo',
        scheduledAt,
        intervalMinutes: dto.intervalMinutes || 1,
        status: 'ACTIVE' as any,
        nextRunAt: scheduledAt,
      },
    });

    // Validate groups exist
    const groups = await this.prisma.group.findMany({
      where: { id: { in: dto.groupIds }, isAvailable: true },
    });

    // Create CampaignGroup records with staggered times
    const intervalMs = (dto.intervalMinutes || 1) * 60 * 1000;
    const campaignGroupsData = groups.map((group, index) => ({
      campaignId: campaign.id,
      groupId: group.id,
      orderIndex: index,
      status: 'PENDING' as any,
      scheduledAt: new Date(scheduledAt.getTime() + index * intervalMs),
    }));

    await this.prisma.campaignGroup.createMany({ data: campaignGroupsData });

    // Schedule BullMQ jobs
    const createdGroups = await this.prisma.campaignGroup.findMany({
      where: { campaignId: campaign.id },
      orderBy: { orderIndex: 'asc' },
    });

    const now = Date.now();
    for (const cg of createdGroups) {
      const delay = Math.max(0, cg.scheduledAt.getTime() - now);
      await this.messageQueue.add({ campaignGroupId: cg.id }, { delay, attempts: 3 });
    }

    return this.prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { campaignGroup: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async findAll(userId: string, status?: string, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: { _count: { select: { campaignGroup: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        campaignGroup: {
          include: { group: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
  }

  async pause(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    
    await this.prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' as any } });
    return { message: 'Campanha pausada com sucesso' };
  }

  async resume(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    // Reschedule pending groups
    const pendingGroups = await this.prisma.campaignGroup.findMany({
      where: { campaignId: id, status: 'PENDING' },
      orderBy: { orderIndex: 'asc' },
    });

    const now = Date.now();
    const intervalMs = campaign.intervalMinutes * 60 * 1000;
    for (let i = 0; i < pendingGroups.length; i++) {
      const delay = i * intervalMs;
      await this.messageQueue.add({ campaignGroupId: pendingGroups[i].id }, { delay, attempts: 3 });
    }

    await this.prisma.campaign.update({ where: { id }, data: { status: 'ACTIVE' as any } });
    return { message: 'Campanha retomada com sucesso' };
  }

  async remove(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campanha removida com sucesso' };
  }
}
