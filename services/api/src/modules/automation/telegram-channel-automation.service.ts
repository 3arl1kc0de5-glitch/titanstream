import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

export interface TelegramChannelConfig {
  channelId: string;
  channelName: string;
  channelType: 'ANNOUNCEMENT' | 'SUCCESS' | 'COMMUNITY';
  enabledEvents: string[];
  messageTemplate: string;
  isActive: boolean;
}

@Injectable()
export class TelegramChannelAutomationService implements OnModuleInit {
  private readonly logger = new Logger(TelegramChannelAutomationService.name);

  private readonly channels = new Map<string, TelegramChannelConfig>();

  constructor(private readonly eventBus: EventBusService) {
    this.seedDefaultChannels();
  }

  onModuleInit() {
    this.logger.log('Telegram Channel Automation Service active. Listening for publish triggers...');

    this.eventBus.on('SettlementCompleted').subscribe({
      next: (event) => this.handleEventPublish('SettlementCompleted', event.payload),
    });
  }

  private seedDefaultChannels() {
    const ch1: TelegramChannelConfig = {
      channelId: '@titanstream_announcements',
      channelName: 'TitanStream Official Announcements',
      channelType: 'ANNOUNCEMENT',
      enabledEvents: ['PLATFORM_ANNOUNCEMENT', 'MILESTONE_REACHED'],
      messageTemplate: '📢 [ANNOUNCEMENT] {title}\n\n{body}',
      isActive: true,
    };

    const ch2: TelegramChannelConfig = {
      channelId: '@titanstream_success_feed',
      channelName: 'TitanStream Live Activity Feed',
      channelType: 'SUCCESS',
      enabledEvents: ['LARGE_DEPOSIT', 'MACHINE_ACTIVATED', 'LARGE_WITHDRAWAL'],
      messageTemplate: '🎉 [COMMUNITY EVENT] {message}',
      isActive: true,
    };

    this.channels.set(ch1.channelId, ch1);
    this.channels.set(ch2.channelId, ch2);
  }

  getChannels(): TelegramChannelConfig[] {
    return Array.from(this.channels.values());
  }

  updateChannel(channelId: string, dto: Partial<TelegramChannelConfig>): TelegramChannelConfig {
    const existing = this.channels.get(channelId);
    if (!existing) throw new Error('CHANNEL_NOT_FOUND');
    const updated = { ...existing, ...dto };
    this.channels.set(channelId, updated);
    return updated;
  }

  publishMessage(channelId: string, message: string) {
    const channel = this.channels.get(channelId);
    if (!channel || !channel.isActive) return false;

    this.logger.log(`[TelegramChannelAutomation] Published to ${channel.channelId}: ${message}`);
    return true;
  }

  private handleEventPublish(eventType: string, payload: any) {
    for (const channel of this.getChannels()) {
      if (channel.isActive && channel.enabledEvents.includes(eventType)) {
        const msg = channel.messageTemplate
          .replace('{title}', payload?.title || eventType)
          .replace('{body}', payload?.message || JSON.stringify(payload))
          .replace('{message}', payload?.message || `Event ${eventType} executed`);
        this.publishMessage(channel.channelId, msg);
      }
    }
  }
}
