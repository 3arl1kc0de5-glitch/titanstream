import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications for authenticated user' })
  async getNotifications(@TelegramUserId() telegramUserId: bigint) {
    const records = await this.service.getNotificationsForUser(telegramUserId);
    return records.map((r) => ({
      id: r.id,
      telegramUserId: r.telegramUserId.toString(),
      templateCode: r.templateCode,
      message: r.message,
      channel: r.channel,
      status: r.status,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(@TelegramUserId() telegramUserId: bigint, @Param('id') id: string) {
    return this.service.markAsRead(telegramUserId, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  async markAllAsRead(@TelegramUserId() telegramUserId: bigint) {
    return this.service.markAllAsRead(telegramUserId);
  }
}
