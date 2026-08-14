import { Controller, Post, Get, Body, Headers, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  createPreference(
    @CurrentUser() user: any,
    @Body() dto: { planId: string; billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' },
  ) {
    return this.paymentsService.createPreference(user.id, dto.planId, dto.billingCycle);
  }

  @Post('webhook')
  handleWebhook(@Body() body: any, @Headers('x-signature') signature: string) {
    // In a real app, verify x-signature here
    return this.paymentsService.handleWebhook(body);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: any) {
    return this.paymentsService.getPaymentHistory(user.id);
  }
}
