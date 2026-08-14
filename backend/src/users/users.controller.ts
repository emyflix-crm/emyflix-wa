import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user) {
    return this.usersService.findById(user.userId);
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user, @Body() body: { name?: string; email?: string }) {
    return this.usersService.updateProfile(user.userId, body);
  }

  @Patch('change-password')
  async changePassword(
    @CurrentUser() user,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.usersService.changePassword(user.userId, body.currentPassword, body.newPassword);
  }

  @Get('trial-info')
  async getTrialInfo(@CurrentUser() user) {
    return this.usersService.getTrialInfo(user.userId);
  }

  @Get('stats')
  async getUserStats(@CurrentUser() user) {
    return this.usersService.getUserStats(user.userId);
  }
}
