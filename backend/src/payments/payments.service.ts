import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoConfig, Preference } from 'mercadopago';

@Injectable()
export class PaymentsService {
  private mp: MercadoPagoConfig;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.mp = new MercadoPagoConfig({
      accessToken: this.config.get('MERCADOPAGO_ACCESS_TOKEN') || 'test',
    });
  }

  async createPreference(userId: string, planId: string, billingCycle: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plano não encontrado');

    const basePrice = Number(plan.price);
    let calculatedPrice: number;
    let title: string;

    if (billingCycle === 'QUARTERLY') {
      calculatedPrice = basePrice * 3 * 0.9;
      title = `EMYFLIX WA - ${plan.name} (Trimestral -10%)`;
    } else if (billingCycle === 'YEARLY') {
      calculatedPrice = basePrice * 12 * 0.8;
      title = `EMYFLIX WA - ${plan.name} (Anual -20%)`;
    } else {
      calculatedPrice = basePrice;
      title = `EMYFLIX WA - ${plan.name} (Mensal)`;
    }

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const appUrl = this.config.get('APP_URL') || 'http://localhost:3001';

    const preference = new Preference(this.mp);
    const response = await preference.create({
      body: {
        items: [{
          id: planId,
          title,
          quantity: 1,
          unit_price: calculatedPrice,
          currency_id: 'BRL',
        }],
        payer: { email: user.email, name: user.name },
        back_urls: {
          success: `${frontendUrl}/meu-plano?status=success`,
          failure: `${frontendUrl}/meu-plano?status=failure`,
          pending: `${frontendUrl}/meu-plano?status=pending`,
        },
        auto_approve: true,
        notification_url: `${appUrl}/api/payments/webhook`,
        metadata: { userId, planId, billingCycle },
      },
    });

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      price: calculatedPrice,
    };
  }

  async handleWebhook(body: any) {
    if (body.type !== 'payment') return { received: true };

    try {
      const paymentId = body.data?.id;
      if (!paymentId) return { received: true };

      const { userId, planId, billingCycle } = body.data?.metadata || {};
      if (!userId || !planId) return { received: true };

      const endsAt = new Date();
      if (billingCycle === 'YEARLY') endsAt.setFullYear(endsAt.getFullYear() + 1);
      else if (billingCycle === 'QUARTERLY') endsAt.setMonth(endsAt.getMonth() + 3);
      else endsAt.setMonth(endsAt.getMonth() + 1);

      const existing = await this.prisma.subscription.findFirst({ where: { userId } });
      if (existing) {
        await this.prisma.subscription.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' as any, planId, billingCycle: billingCycle as any, startsAt: new Date(), endsAt, mercadoPagoId: String(paymentId) },
        });
      } else {
        await this.prisma.subscription.create({
          data: { userId, planId, status: 'ACTIVE' as any, billingCycle: billingCycle as any, startsAt: new Date(), endsAt, mercadoPagoId: String(paymentId) },
        });
      }

      await this.prisma.user.update({ where: { id: userId }, data: { isTrialActive: false } });
    } catch (e) {
      console.error('Webhook error:', e);
    }

    return { received: true };
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
