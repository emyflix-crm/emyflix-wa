import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
// Mock import since we don't know the exact structure of whatsapp service
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('message-queue')
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    @InjectQueue('message-queue') private messageQueue: Queue,
  ) {}

  @Process()
  async processMessage(job: Job<{ campaignGroupId: string }>) {
    const { campaignGroupId } = job.data;

    const campaignGroup = await this.prisma.campaignGroup.findUnique({
      where: { id: campaignGroupId },
      include: {
        campaign: {
          include: {
            user: {
              include: { subscription: { include: { plan: true } } },
            },
          },
        },
        group: { include: { instance: true } },
      },
    });

    if (!campaignGroup) return;

    const { campaign, group } = campaignGroup;
    const user = campaign.user;
    const instance = group.instance;

    const updateStatus = async (status: string, errorMessage?: string) => {
      await this.prisma.campaignGroup.update({
        where: { id: campaignGroupId },
        data: { status, errorMessage, sentAt: status === 'SENT' ? new Date() : null },
      });

      await this.prisma.messageHistory.create({
        data: {
          userId: user.id,
          campaignId: campaign.id,
          groupId: group.id,
          status,
          errorMessage,
        },
      });
      
      this.checkCampaignCompletion(campaign.id);
    };

    if (campaign.status !== 'ACTIVE') {
      await updateStatus('SKIPPED', 'Campaign not active');
      return;
    }

    try {
      const isConnected = await this.whatsappService.checkConnection(instance.instanceKey);
      if (!isConnected) {
        await updateStatus('FAILED', 'WhatsApp desconectado');
        return;
      }
    } catch (e) {
      await updateStatus('FAILED', 'WhatsApp desconectado');
      return;
    }

    const sub = user.subscription;
    if (!sub || (sub.endsAt && sub.endsAt < new Date())) {
      await updateStatus('FAILED', 'Assinatura expirada');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyUsage = await this.prisma.dailyUsage.findFirst({
      where: { userId: user.id, date: today },
    });
    
    if ((dailyUsage?.messagesCount || 0) >= sub.plan.maxMessagesPerDay) {
      await updateStatus('FAILED', 'Limite diário atingido');
      return;
    }

    if (!group.isAvailable) {
      await updateStatus('SKIPPED', 'Grupo não disponível');
      return;
    }

    try {
      if (campaign.mediaType === 'TEXT') {
        await this.whatsappService.sendTextMessage(instance.instanceKey, group.groupJid, campaign.message);
      } else {
        await this.whatsappService.sendMediaMessage(instance.instanceKey, group.groupJid, campaign.mediaType, campaign.mediaUrl, campaign.message);
      }

      await this.prisma.dailyUsage.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        create: { userId: user.id, date: today, messagesCount: 1 },
        update: { messagesCount: { increment: 1 } },
      });

      await updateStatus('SENT');
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      await updateStatus('FAILED', error.message);
    }
  }

  private async checkCampaignCompletion(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { campaignGroups: true },
    });

    if (!campaign) return;

    const allDone = campaign.campaignGroups.every(cg => ['SENT', 'FAILED', 'SKIPPED'].includes(cg.status));
    
    if (allDone) {
      if (campaign.recurrenceType === 'ONCE') {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED' },
        });
      } else {
        const nextRunAt = this.calculateNextRun(campaign.recurrenceType, campaign.nextRunAt || campaign.scheduledAt);
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { nextRunAt },
        });

        // Reset and schedule again
        const groupsData = campaign.campaignGroups.map((cg, index) => {
          const scheduledTime = new Date(nextRunAt.getTime() + index * (campaign.intervalMinutes || 0) * 60000);
          return {
            campaignId: campaign.id,
            groupId: cg.groupId,
            status: 'PENDING',
            scheduledAt: scheduledTime,
          };
        });

        await this.prisma.campaignGroup.deleteMany({ where: { campaignId } });
        
        await this.prisma.campaignGroup.createMany({
          data: groupsData,
        });

        const newCampaignGroups = await this.prisma.campaignGroup.findMany({
          where: { campaignId },
        });

        const now = new Date();
        for (const cg of newCampaignGroups) {
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
      }
    }
  }

  private calculateNextRun(recurrenceType: string, scheduledAt: Date): Date {
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
