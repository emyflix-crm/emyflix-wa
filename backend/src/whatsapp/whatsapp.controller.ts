import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('instances')
  async createInstance(@CurrentUser() user, @Body() body: { instanceName: string }) {
    return this.whatsappService.createInstance(user.userId, body.instanceName);
  }

  @Get('instances')
  async getInstances(@CurrentUser() user) {
    return this.whatsappService.getUserInstances(user.userId);
  }

  @Get('instances/:id/qrcode')
  async getQRCode(@CurrentUser() user, @Param('id') id: string) {
    return this.whatsappService.getQRCode(user.userId, id);
  }
}
