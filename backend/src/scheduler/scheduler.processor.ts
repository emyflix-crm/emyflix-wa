import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Processor('message-queue')
export class SchedulerProcessor {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {}

  @Process()
  async processMessage(job: Job<{ campaignGroupId: string }>) {
    const { campaignGroupId } = job.data;

    const campaignGroup = await this.prisma.campaignGroup.findUnique({
      where: { id: campaignGroupId },
      include: {
        campaign: true,
        group: true,
      },
    });

    if (!campaignGroup) return;

    const campaign = (campaignGroup as any).campaign;
    const group = (campaignGroup as any).group;

    const updateStatus = async (status: string, errorMessage?: string) => {
      await this.prisma.campaignGroup.update({
        where: { id: campaignGroupId },
        data: {
          status: status as any,
          errorMessage: errorMessage || null,
          sentAt: status === 'SENT' ? new Date() : null,
        },
      });
    };

    try {
      // Check campaign is active
      if (campaign.status !== 'ACTIVE') {
        await updateStatus('SKIPPED', 'Campanha não está ativa');
        return;
      }

      // Check group is available
      if (!group.isAvailable) {
        await updateStatus('SKIPPED', 'Grupo não disponível');
        return;
      }

      // Check instance status
      const instance = await this.prisma.whatsAppInstance.findUnique({
        where: { id: campaign.instanceId },
      });
      if (!instance || instance.status !== 'CONNECTED') {
        await updateStatus('FAILED', 'WhatsApp desconectado');
        await this.createHistory(campaignGroup, 'FAILED', 'WhatsApp desconectado');
        return;
      }

      // Check subscription
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId: campaign.userId, status: { in: ['ACTIVE', 'TRIAL'] } },
        include: { plan: true },
      });
      if (!subscription || (subscription.endsAt && subscription.endsAt < new Date())) {
        await updateStatus('FAILED', 'Assinatura expirada');
        await this.createHistory(campaignGroup, 'FAILED', 'Assinatura expirada');
        return;
      }

      // Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usage = await this.prisma.dailyUsage.findFirst({
        where: { userId: campaign.userId, date: { gte: today } },
      });
      const currentUsage = usage?.messagesCount || 0;
      if (currentUsage >= subscription.plan.maxMessagesPerDay) {
        await updateStatus('FAILED', 'Limite diário de mensagens atingido');
        await this.createHistory(campaignGroup, 'FAILED', 'Limite diário atingido');
        return;
      }

      // Send message
      if (campaign.mediaType === 'TEXT' || !campaign.mediaUrl) {
        await this.whatsappService.sendMessage(instance.instanceKey, group.groupJid, campaign.message);
      } else {
        await this.whatsappService.sendMessage(instance.instanceKey, group.groupJid, campaign.message, campaign.mediaUrl, campaign.mediaType);
      }

      // Success
      await updateStatus('SENT');
      await this.createHistory(campaignGroup, 'SENT');

      // Update daily usage
      if (usage) {
        await this.prisma.dailyUsage.update({
          where: { id: usage.id },
          data: { messagesCount: { increment: 1 } },
        });
      } else {
        await this.prisma.dailyUsage.create({
          data: { userId: campaign.userId, date: today, messagesCount: 1 },
        });
      }

    } catch (error) {
      await updateStatus('FAILED', error.message);
      await this.createHistory(campaignGroup, 'FAILED', error.message);
    }

    // Check if all groups done for this campaign
    const allGroups = await this.prisma.campaignGroup.findMany({
      where: { campaignId: campaign.id },
    });
    const allDone = allGroups.every(cg => ['SENT', 'FAILED', 'SKIPPED'].includes(cg.status));

    if (allDone) {
      if (campaign.recurrenceType === 'ONCE') {
        await this.prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'COMPLETED' as any } });
      }
    }
  }

  private async createHistory(campaignGroup: any, status: string, errorMessage?: string) {
    const campaign = campaignGroup.campaign;
    const group = campaignGroup.group;
    try {
      await this.prisma.messageHistory.create({
        data: {
          userId: campaign.userId,
          campaignId: campaign.id,
          campaignGroupId: campaignGroup.id,
          instanceId: campaign.instanceId,
          groupId: group?.id,
          groupName: group?.name,
          status: status as any,
          errorMessage: errorMessage || null,
          sentAt: new Date(),
        },
      });
    } catch (e) {
      console.error('Error creating message history:', e);
    }
  }
}
