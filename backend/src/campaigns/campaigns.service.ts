import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export class CreateCampaignDto {
  name: string;
  message: string;
  mediaType: string;
  mediaUrl?: string;
  groupIds: string[];
  scheduledAt: Date;
  intervalMinutes: number;
  recurrenceType: string;
}

export class UpdateCampaignDto {
  name?: string;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('message-queue') private readonly messageQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateCampaignDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        instances: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const connectedInstance = user.instances.find(i => i.status === 'CONNECTED');
    if (!connectedInstance) {
      throw new BadRequestException('No connected WhatsApp instance found.');
    }

    const subscription = user.subscription;
    if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.status) || (subscription.endsAt && subscription.endsAt < new Date())) {
      throw new BadRequestException('No active subscription found.');
    }

    const plan = subscription.plan;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyUsage = await this.prisma.dailyUsage.findFirst({
      where: { userId, date: today },
    });
    const currentMessagesCount = dailyUsage?.messagesCount || 0;
    if (currentMessagesCount + dto.groupIds.length > plan.maxMessagesPerDay) {
      throw new BadRequestException('Daily message limit would be exceeded.');
    }

    const activeCampaigns = await this.prisma.campaign.count({
      where: { userId, status: 'ACTIVE' },
    });
    if (activeCampaigns >= plan.maxCampaigns) {
      throw new BadRequestException('Max active campaigns reached for this plan.');
    }

    if (dto.groupIds.length > plan.maxGroups) {
      throw new BadRequestException('Max groups per campaign exceeded for this plan.');
    }

    const groups = await this.prisma.group.findMany({
      where: { id: { in: dto.groupIds }, instanceId: connectedInstance.id },
    });

    if (groups.length === 0) {
      throw new BadRequestException('No valid groups selected.');
    }

    const nextRunAt = this.calculateNextRun(dto.recurrenceType, dto.scheduledAt);

    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        name: dto.name,
        message: dto.message,
        mediaType: dto.mediaType || 'TEXT',
        mediaUrl: dto.mediaUrl,
        recurrenceType: dto.recurrenceType || 'ONCE',
        status: 'ACTIVE',
        scheduledAt: new Date(dto.scheduledAt),
        intervalMinutes: dto.intervalMinutes || 0,
        nextRunAt,
      },
    });

    const campaignGroupsData = groups.map((group, index) => {
      const scheduledTime = new Date(new Date(dto.scheduledAt).getTime() + index * (dto.intervalMinutes || 0) * 60000);
      return {
        campaignId: campaign.id,
        groupId: group.id,
        status: 'PENDING',
        scheduledAt: scheduledTime,
      };
    });

    await this.prisma.campaignGroup.createMany({
      data: campaignGroupsData,
    });

    const campaignGroups = await this.prisma.campaignGroup.findMany({
      where: { campaignId: campaign.id },
    });

    const now = new Date();
    for (const cg of campaignGroups) {
      let delay = new Date(cg.scheduledAt).getTime() - now.getTime();
      if (delay < 0) delay = 0;
      
      const job = await this.messageQueue.add(
        { campaignGroupId: cg.id },
        { delay }
      );

      await this.prisma.campaignGroup.update({
        where: { id: cg.id },
        data: { jobId: job.id.toString() },
      });
    }

    return await this.prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { campaignGroups: true },
    });
  }

  async findAll(userId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const whereClause: any = { userId };
    if (status) whereClause.status = status;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: whereClause,
        skip,
        take: +limit,
        include: { _count: { select: { campaignGroups: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where: whereClause }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        campaignGroups: {
          include: { group: true },
        },
        groups: true,
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(userId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(userId, id);
    return this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { name: dto.name },
    });
  }

  async pause(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);
    
    const pendingGroups = campaign.campaignGroups.filter(cg => cg.status === 'PENDING' && cg.jobId);
    for (const cg of pendingGroups) {
      if (cg.jobId) {
        const job = await this.messageQueue.getJob(cg.jobId);
        if (job) await job.remove();
      }
      await this.prisma.campaignGroup.update({
        where: { id: cg.id },
        data: { jobId: null },
      });
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resume(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);
    
    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    const pendingGroups = campaign.campaignGroups.filter(cg => cg.status === 'PENDING');
    const now = new Date();

    for (const cg of pendingGroups) {
      let delay = new Date(cg.scheduledAt).getTime() - now.getTime();
      if (delay < 0) delay = 0;
      
      const job = await this.messageQueue.add(
        { campaignGroupId: cg.id },
        { delay }
      );

      await this.prisma.campaignGroup.update({
        where: { id: cg.id },
        data: { jobId: job.id.toString() },
      });
    }

    return updatedCampaign;
  }

  async remove(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);
    
    for (const cg of campaign.campaignGroups) {
      if (cg.jobId) {
        const job = await this.messageQueue.getJob(cg.jobId);
        if (job) await job.remove();
      }
    }

    await this.prisma.campaignGroup.deleteMany({ where: { campaignId: id } });
    return this.prisma.campaign.delete({ where: { id } });
  }

  private calculateNextRun(recurrenceType: string, scheduledAt: Date | string): Date | null {
    if (!recurrenceType || recurrenceType === 'ONCE') return null;
    const next = new Date(scheduledAt);
    if (recurrenceType === 'DAILY') {
      next.setDate(next.getDate() + 1);
    } else if (recurrenceType === 'WEEKLY') {
      next.setDate(next.getDate() + 7);
    } else if (recurrenceType === 'MONTHLY') {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }
}
