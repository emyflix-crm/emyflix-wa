import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class PaymentsService {
  private mercadopago: MercadoPagoConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (accessToken) {
      this.mercadopago = new MercadoPagoConfig({ accessToken });
    }
  }

  async createPreference(userId: string, planId: string, billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    let calculatedPrice = plan.price;
    if (billingCycle === 'QUARTERLY') {
      calculatedPrice = plan.price * 3 * 0.9;
    } else if (billingCycle === 'YEARLY') {
      calculatedPrice = plan.price * 12 * 0.8;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    const preferenceClient = new Preference(this.mercadopago);
    
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: plan.id,
            title: `EMYFLIX WA - Plano ${plan.name}`,
            quantity: 1,
            unit_price: calculatedPrice,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: user.email,
          name: user.name,
        },
        back_urls: {
          success: `${frontendUrl}/meu-plano`,
          failure: `${frontendUrl}/meu-plano`,
          pending: `${frontendUrl}/meu-plano`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/payments/webhook`,
        metadata: {
          userId,
          planId,
          billingCycle,
        },
      }
    });

    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      price: calculatedPrice,
    };
  }

  async handleWebhook(body: any) {
    if (body.type === 'payment') {
      const paymentId = body.data.id;
      const paymentClient = new Payment(this.mercadopago);
      const payment = await paymentClient.get({ id: paymentId });

      if (payment.status === 'approved') {
        const metadata = payment.metadata;
        if (metadata && metadata.userId && metadata.planId) {
          const { userId, planId, billingCycle } = metadata;
          
          const now = new Date();
          const endsAt = new Date(now);
          
          if (billingCycle === 'MONTHLY') {
            endsAt.setMonth(endsAt.getMonth() + 1);
          } else if (billingCycle === 'QUARTERLY') {
            endsAt.setMonth(endsAt.getMonth() + 3);
          } else if (billingCycle === 'YEARLY') {
            endsAt.setFullYear(endsAt.getFullYear() + 1);
          }

          await this.prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              planId,
              status: 'ACTIVE',
              billingCycle: billingCycle || 'MONTHLY',
              startsAt: now,
              endsAt,
              mercadoPagoId: payment.id?.toString(),
            },
            update: {
              planId,
              status: 'ACTIVE',
              billingCycle: billingCycle || 'MONTHLY',
              startsAt: now,
              endsAt,
              mercadoPagoId: payment.id?.toString(),
            },
          });

          await this.prisma.user.update({
            where: { id: userId },
            data: { isTrialActive: false },
          });
        }
      }
    }
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
