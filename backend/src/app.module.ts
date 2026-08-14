import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { PlansModule } from './plans/plans.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { GroupsModule } from './groups/groups.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HistoryModule } from './history/history.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    PlansModule,
    WhatsAppModule,
    GroupsModule,
    CampaignsModule,
    SchedulerModule,
    HistoryModule,
    AdminModule,
    PaymentsModule,
  ],
})
export class AppModule {}
