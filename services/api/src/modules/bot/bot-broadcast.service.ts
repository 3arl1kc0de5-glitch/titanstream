import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramClientService } from './telegram-client.service';

export interface CreateBroadcastDto {
  title: string;
  message: string;
  target?: 'ALL' | 'VERIFIED' | 'READY';
  createdById?: string;
}

@Injectable()
export class BotBroadcastService {
  private readonly logger = new Logger(BotBroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramClient: TelegramClientService,
  ) {}

  async createAndDispatchBroadcast(dto: CreateBroadcastDto) {
    const broadcast = await this.prisma.botBroadcast.create({
      data: {
        title: dto.title,
        message: dto.message,
        target: dto.target || 'ALL',
        status: 'PROCESSING',
        createdById: dto.createdById,
      },
    });

    // Run dispatch asynchronously
    this.processBroadcast(broadcast.id).catch((err) =>
      this.logger.error(`Error processing broadcast ${broadcast.id}: ${err.message}`),
    );

    return broadcast;
  }

  private async processBroadcast(broadcastId: string) {
    const broadcast = await this.prisma.botBroadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) return;

    let where: any = {};
    if (broadcast.target === 'VERIFIED') {
      where = { channelVerified: true };
    } else if (broadcast.target === 'READY') {
      where = { isReady: true };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { telegramUserId: true },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const u of users) {
      const res = await this.telegramClient.sendMessage(Number(u.telegramUserId), `<b>📢 ${broadcast.title}</b>\n\n${broadcast.message}`, {
        parse_mode: 'HTML',
      });

      if (res.ok) sentCount++;
      else failedCount++;

      // Small delay to respect Telegram rate limits (30 msgs/sec max)
      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    await this.prisma.botBroadcast.update({
      where: { id: broadcastId },
      data: {
        sentCount,
        failedCount,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Broadcast ${broadcastId} completed. Sent: ${sentCount}, Failed: ${failedCount}`);
  }

  async listBroadcasts() {
    return this.prisma.botBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
