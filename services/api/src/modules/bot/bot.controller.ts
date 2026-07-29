import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { BotDispatcherService, TelegramUpdate } from './bot-dispatcher.service';
import { BotGateService } from './bot-gate.service';
import { BotBroadcastService, CreateBroadcastDto } from './bot-broadcast.service';
import { BotAnalyticsService } from './bot-analytics.service';
import { BotPaymentService } from './bot-payment.service';
import { BotAdminService } from './bot-admin.service';
import { BotMonetizationService } from './bot-monetization.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Telegram Bot')
@Controller('bot')
export class BotController {
  constructor(
    private readonly botDispatcher: BotDispatcherService,
    private readonly botGate: BotGateService,
    private readonly botBroadcast: BotBroadcastService,
    private readonly botAnalytics: BotAnalyticsService,
    private readonly botPayment: BotPaymentService,
    private readonly botAdmin: BotAdminService,
    private readonly botMonetization: BotMonetizationService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram Bot Webhook endpoint for receiving Telegram updates' })
  async handleWebhook(@Body() update: TelegramUpdate) {
    if (update && update.update_id) {
      await this.botDispatcher.handleUpdate(update);
    }
    return { ok: true };
  }

  @Public()
  @Post('webhook/cryptobot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook handler for CryptoBot deposit invoice payments' })
  async handleCryptoBotWebhook(@Body() payload: { externalInvoiceId?: string; invoice_id?: string; status?: string }) {
    const invId = payload.externalInvoiceId || payload.invoice_id;
    if (invId && (payload.status === 'PAID' || payload.status === 'paid')) {
      return this.botPayment.processInvoicePaid(invId);
    }
    return { ok: true };
  }

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Get Telegram Host Bot configuration' })
  getBotConfig() {
    return {
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'titanstream_bot',
      channelId: process.env.TELEGRAM_CHANNEL_ID || '@tetherstream',
      channelUsername: process.env.TELEGRAM_CHANNEL_USERNAME || 'tetherstream',
      webAppUrl: process.env.TELEGRAM_WEBAPP_URL || 'https://tetherstream.app',
      status: 'ONLINE',
    };
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify Telegram channel membership status' })
  async verifyMembership(@Body() body: { telegramUserId: string }) {
    const userId = BigInt(body.telegramUserId);
    const result = await this.botGate.verifyChannelMembership(userId);
    return result;
  }

  @Public()
  @Get('emergency')
  @ApiOperation({ summary: 'Get current system emergency controls state' })
  async getEmergencyState() {
    return this.botAdmin.getEmergencyState();
  }

  @Public()
  @Post('emergency')
  @ApiOperation({ summary: 'Toggle emergency system pause controls' })
  async toggleEmergencyState(@Body() body: { field: 'depositsPaused' | 'withdrawalsPaused' | 'rewardsPaused' | 'resumeAll'; adminUsername?: string }) {
    return this.botAdmin.toggleEmergencyPause(body.field, body.adminUsername || 'API_ADMIN');
  }

  @Public()
  @Post('broadcast')
  @ApiOperation({ summary: 'Admin endpoint to trigger announcement broadcasts' })
  async createBroadcast(@Body() dto: CreateBroadcastDto) {
    return this.botBroadcast.createAndDispatchBroadcast(dto);
  }

  @Public()
  @Get('broadcasts')
  @ApiOperation({ summary: 'Get history of broadcast campaigns' })
  async listBroadcasts() {
    return this.botBroadcast.listBroadcasts();
  }

  @Public()
  @Get('analytics')
  @ApiOperation({ summary: 'Get bot acquisition, engagement, and conversion analytics' })
  async getAnalytics() {
    return this.botAnalytics.getMetricsOverview();
  }
}
