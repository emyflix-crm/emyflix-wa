import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  getHistory(@CurrentUser() user: any, @Query() filters: any) {
    return this.historyService.getUserHistory(user.id, filters);
  }

  @Get('stats')
  getStats(@CurrentUser() user: any, @Query() filters: any) {
    return this.historyService.getUserStats(user.id, filters);
  }

  @Get('usage')
  getUsage(@CurrentUser() user: any) {
    return this.historyService.getDailyUsage(user.id);
  }
}
