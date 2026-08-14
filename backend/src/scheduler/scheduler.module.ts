import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SchedulerProcessor } from './scheduler.processor';

@Module({
  imports: [
    PrismaModule,
    WhatsAppModule,
    BullModule.registerQueue({
      name: 'message-queue',
    }),
  ],
  providers: [SchedulerProcessor],
})
export class SchedulerModule {}
