import { Injectable, Logger } from '@nestjs/common';
import { TelegramClientService } from './telegram-client.service';
import { BotGateService, TelegramUserCtx } from './bot-gate.service';
import { BotCommandService, getPersistentMainKeyboard } from './bot-command.service';
import { BotAssistantService } from './bot-assistant.service';
import { BotAdminService } from './bot-admin.service';
import { BotPaymentService } from './bot-payment.service';
import { BotWithdrawalService } from './bot-withdrawal.service';
import { BotMonetizationService } from './bot-monetization.service';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

@Injectable()
export class BotDispatcherService {
  private readonly logger = new Logger(BotDispatcherService.name);
  private readonly webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://titanstream.app';

  constructor(
    private readonly telegramClient: TelegramClientService,
    private readonly botGate: BotGateService,
    private readonly botCommand: BotCommandService,
    private readonly botAssistant: BotAssistantService,
    private readonly botAdmin: BotAdminService,
    private readonly botPayment: BotPaymentService,
    private readonly botWithdrawal: BotWithdrawalService,
    private readonly botMonetization: BotMonetizationService,
  ) {}

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message && update.message.text) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(msg: NonNullable<TelegramUpdate['message']>): Promise<void> {
    const userCtx: TelegramUserCtx = {
      id: BigInt(msg.from.id),
      firstName: msg.from.first_name,
      lastName: msg.from.last_name,
      username: msg.from.username,
      languageCode: msg.from.language_code,
    };

    const text = msg.text?.trim() || '';
    let response: { text: string; keyboard: any } = { text: '', keyboard: null };

    // Slash commands & Persistent Keyboard Buttons mapping
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1];
      response = await this.botCommand.handleStart(userCtx, startParam);
    } else if (text === '🚀 Open TitanStream' || text.startsWith('/app')) {
      response = await this.botCommand.handleApp(userCtx);
    } else if (text === '💰 Balance' || text.startsWith('/balance')) {
      response = await this.botCommand.handleBalance(userCtx);
    } else if (text === '➕ Deposit' || text.startsWith('/deposit')) {
      response = await this.botPayment.getDepositMenu(userCtx.id);
    } else if (text === '💸 Withdraw' || text.startsWith('/withdraw')) {
      response = await this.botWithdrawal.getWithdrawalMenu(userCtx.id);
    } else if (text === '🎁 Rewards' || text === '👥 Referrals' || text.startsWith('/referrals')) {
      response = await this.botCommand.handleReferrals(userCtx);
    } else if (text === '⭐ Trust Level') {
      response = await this.botAssistant.handleAssistantQuery('asst_q_trust');
    } else if (text === '📚 Learn') {
      response = await this.botAssistant.getEducationMenu();
    } else if (text === '🆘 Support' || text.startsWith('/help')) {
      response = await this.botCommand.handleHelp(userCtx);
    } else if (text === '⚙️ Settings' || text.startsWith('/settings')) {
      response = await this.botCommand.handleSettings(userCtx);
    } else if (text === '🚀 Upgrade' || text.startsWith('/upgrade')) {
      response = await this.botMonetization.getProductsMenu(userCtx.id);
    } else if (text.startsWith('/admin') || text === '⚙️ Admin Dashboard') {
      response = await this.botAdmin.handleAdminDashboard(userCtx);
    } else if (text.startsWith('/status') && this.botAdmin.isAdmin(userCtx.id)) {
      response = await this.botAdmin.handleStatus();
    } else if (text.startsWith('/orders') && this.botAdmin.isAdmin(userCtx.id)) {
      response = await this.botAdmin.handleOrders();
    } else if (text.startsWith('/alerts') && this.botAdmin.isAdmin(userCtx.id)) {
      response = await this.botAdmin.handleAlerts();
    } else if (text.startsWith('/treasury') && this.botAdmin.isAdmin(userCtx.id)) {
      response = await this.botAdmin.handleTreasury();
    } else if (text.startsWith('/users') && this.botAdmin.isAdmin(userCtx.id)) {
      response = await this.botAdmin.handleUsers();
    } else {
      response = await this.botCommand.handleStart(userCtx);
    }

    if (response.text) {
      // Ensure persistent reply keyboard is attached
      const finalKeyboard = response.keyboard?.keyboard
        ? response.keyboard
        : {
            ...response.keyboard,
            ...getPersistentMainKeyboard(this.webAppUrl),
          };

      await this.telegramClient.sendMessage(msg.chat.id, response.text, {
        reply_markup: finalKeyboard,
      });
    }
  }

  private async handleCallbackQuery(cb: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
    const userCtx: TelegramUserCtx = {
      id: BigInt(cb.from.id),
      firstName: cb.from.first_name,
      lastName: cb.from.last_name,
      username: cb.from.username,
      languageCode: cb.from.language_code,
    };

    const data = cb.data || '';
    const chatId = cb.message?.chat?.id || Number(userCtx.id);

    await this.telegramClient.answerCallbackQuery(cb.id);

    let response: { text: string; keyboard: any } = { text: '', keyboard: null };

    if (data === 'verify_membership' || data === 'cmd_start') {
      response = await this.botCommand.handleStart(userCtx);
    } else if (data === 'cmd_balance') {
      response = await this.botCommand.handleBalance(userCtx);
    } else if (data === 'cmd_deposit') {
      response = await this.botPayment.getDepositMenu(userCtx.id);
    } else if (data.startsWith('dep_amt_')) {
      const amount = Number(data.replace('dep_amt_', ''));
      response = await this.botPayment.createDepositInvoice({ telegramUserId: userCtx.id, amount });
    } else if (data.startsWith('chk_inv_')) {
      const invId = data.replace('chk_inv_', '');
      response = await this.botPayment.checkInvoiceStatus(invId);
    } else if (data.startsWith('cnc_inv_')) {
      const invId = data.replace('cnc_inv_', '');
      response = await this.botPayment.cancelInvoice(invId);
    } else if (data === 'cmd_withdraw') {
      response = await this.botWithdrawal.getWithdrawalMenu(userCtx.id);
    } else if (data === 'wd_req_start') {
      response = await this.botWithdrawal.getWithdrawalAmountStep();
    } else if (data.startsWith('wd_amt_')) {
      const amount = Number(data.replace('wd_amt_', ''));
      response = await this.botWithdrawal.getWithdrawalNetworkStep(amount);
    } else if (data.startsWith('wd_net_')) {
      const parts = data.replace('wd_net_', '').split('_');
      const network = parts[0];
      const amount = Number(parts[1] || '20');
      response = await this.botWithdrawal.processWithdrawalRequest({
        telegramUserId: userCtx.id,
        amount,
        network,
        destinationAddress: `0x${userCtx.id.toString(16).padStart(40, '0')}`,
      });
    } else if (data === 'wd_list_pending') {
      response = await this.botWithdrawal.listPendingWithdrawals(userCtx.id);
    } else if (data === 'wd_list_history') {
      response = await this.botWithdrawal.listWithdrawalHistory(userCtx.id);
    } else if (data === 'cmd_referrals') {
      response = await this.botCommand.handleReferrals(userCtx);
    } else if (data === 'cmd_help') {
      response = await this.botCommand.handleHelp(userCtx);
    } else if (data === 'cmd_settings') {
      response = await this.botCommand.handleSettings(userCtx);
    } else if (data === 'cmd_upgrade') {
      response = await this.botMonetization.getProductsMenu(userCtx.id);
    } else if (data.startsWith('prod_view_')) {
      const code = data.replace('prod_view_', '');
      response = await this.botMonetization.getProductDetails(code);
    } else if (data.startsWith('prod_buy_')) {
      const code = data.replace('prod_buy_', '');
      response = await this.botMonetization.buyProduct(userCtx.id, code);
    } else if (data.startsWith('ticket_')) {
      const category = data.replace('ticket_', '');
      response = await this.botCommand.createSupportTicketFromBot(userCtx, category);
    } else if (data === 'assistant_menu') {
      response = await this.botAssistant.getAssistantMenu(userCtx);
    } else if (data.startsWith('asst_q_')) {
      response = await this.botAssistant.handleAssistantQuery(data);
    } else if (data === 'edu_menu') {
      response = await this.botAssistant.getEducationMenu();
    } else if (data.startsWith('edu_lesson_')) {
      const lessonKey = data.replace('edu_lesson_', '');
      response = await this.botAssistant.getLesson(lessonKey);
    } else if (data.startsWith('admin_') && this.botAdmin.isAdmin(userCtx.id)) {
      const adminCmd = data.replace('admin_', '');
      if (adminCmd === 'status') response = await this.botAdmin.handleStatus();
      else if (adminCmd === 'orders') response = await this.botAdmin.handleOrders();
      else if (adminCmd === 'alerts') response = await this.botAdmin.handleAlerts();
      else if (adminCmd === 'treasury') response = await this.botAdmin.handleTreasury();
      else if (adminCmd === 'users') response = await this.botAdmin.handleUsers();
      else if (adminCmd === 'emergency_menu') response = await this.botAdmin.getEmergencyMenu();
    } else if (data.startsWith('emg_') && this.botAdmin.isAdmin(userCtx.id)) {
      const action = data.replace('emg_', '');
      if (action === 'toggle_deposits') response = await this.botAdmin.toggleEmergencyPause('depositsPaused', userCtx.username || 'admin');
      else if (action === 'toggle_withdrawals') response = await this.botAdmin.toggleEmergencyPause('withdrawalsPaused', userCtx.username || 'admin');
      else if (action === 'toggle_rewards') response = await this.botAdmin.toggleEmergencyPause('rewardsPaused', userCtx.username || 'admin');
      else if (action === 'resume_all') response = await this.botAdmin.toggleEmergencyPause('resumeAll', userCtx.username || 'admin');
    }

    if (response.text) {
      await this.telegramClient.sendMessage(chatId, response.text, {
        reply_markup: response.keyboard,
      });
    }
  }
}
