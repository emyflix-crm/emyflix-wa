import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HistoryModule } from './history/history.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PlansModule,
    WhatsAppModule,
    CampaignsModule,
    SchedulerModule,
    HistoryModule,
    AdminModule,
    PaymentsModule,
  ],
})
export class AppModule {}
