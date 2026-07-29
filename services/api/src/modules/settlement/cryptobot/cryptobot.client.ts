import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { CryptoBotApiResponse, CryptoBotInvoicePayload, CryptoBotInvoiceResponse, CryptoBotNetwork } from './cryptobot.types';

@Injectable()
export class CryptoBotClient {
  private readonly logger = new Logger(CryptoBotClient.name);
  private apiToken: string;
  private network: CryptoBotNetwork;
  private baseUrl: string;

  constructor() {
    this.apiToken = process.env.CRYPTOBOT_API_TOKEN || '';
    this.network = (process.env.CRYPTOBOT_NETWORK as CryptoBotNetwork) || 'testnet';
    this.baseUrl =
      this.network === 'mainnet'
        ? 'https://pay.crypt.bot/api/'
        : 'https://testnet-pay.crypt.bot/api/';
  }

  setCredentials(token: string, network: CryptoBotNetwork = 'testnet') {
    this.apiToken = token;
    this.network = network;
    this.baseUrl =
      network === 'mainnet'
        ? 'https://pay.crypt.bot/api/'
        : 'https://testnet-pay.crypt.bot/api/';
  }

  getApiToken(): string {
    return this.apiToken;
  }

  /**
   * Create an invoice via CryptoBot API.
   */
  async createInvoice(payload: CryptoBotInvoicePayload): Promise<CryptoBotInvoiceResponse> {
    this.logger.log(`[CryptoBotClient] Creating invoice for ${payload.amount} ${payload.asset}...`);

    if (!this.apiToken) {
      this.logger.warn('[CryptoBotClient] No CRYPTOBOT_API_TOKEN set. Generating fallback mock invoice for sandbox testing.');
      const mockId = Math.floor(100000 + Math.random() * 900000);
      return {
        invoice_id: mockId,
        hash: `mock_hash_${mockId}`,
        currency_type: 'crypto',
        asset: payload.asset,
        amount: payload.amount,
        pay_url: `https://t.me/CryptoBot?start=IV${mockId}`,
        bot_invoice_url: `https://t.me/CryptoBot?start=IV${mockId}`,
        mini_app_invoice_url: `https://t.me/CryptoBot/app?startapp=invoice-${mockId}`,
        web_app_invoice_url: `https://t.me/CryptoBot/app?startapp=invoice-${mockId}`,
        status: 'active',
        created_at: new Date().toISOString(),
        allow_comments: true,
        allow_anonymous: false,
        description: payload.description,
        payload: payload.payload,
      };
    }

    return this.request<CryptoBotInvoiceResponse>('createInvoice', payload);
  }

  /**
   * Fetch a single invoice status by invoice_id.
   */
  async getInvoice(invoiceId: number): Promise<CryptoBotInvoiceResponse | null> {
    const list = await this.getInvoices({ invoice_ids: [invoiceId] });
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Fetch invoices list by invoice_ids or status.
   */
  async getInvoices(options: { invoice_ids?: number[]; status?: string; offset?: number; count?: number } = {}): Promise<CryptoBotInvoiceResponse[]> {
    if (!this.apiToken) {
      return [];
    }

    const queryParams = new URLSearchParams();
    if (options.invoice_ids && options.invoice_ids.length > 0) {
      queryParams.append('invoice_ids', options.invoice_ids.join(','));
    }
    if (options.status) {
      queryParams.append('status', options.status);
    }
    if (options.offset) queryParams.append('offset', options.offset.toString());
    if (options.count) queryParams.append('count', options.count.toString());

    const endpoint = `getInvoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<CryptoBotInvoiceResponse[]>(endpoint, null, 'GET');
  }

  /**
   * Helper function for executing HTTP requests to CryptoBot.
   */
  private async request<T>(endpoint: string, data?: any, method = 'POST'): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Crypto-Pay-API-Token': this.apiToken,
      'Content-Type': 'application/json',
    };

    try {
      const options: RequestInit = {
        method,
        headers,
      };
      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const resJson = (await response.json()) as CryptoBotApiResponse<T>;
      if (!resJson.ok) {
        throw new Error(`CryptoBot API Error: ${resJson.error?.name || 'Unknown Error'} (code: ${resJson.error?.code})`);
      }

      return resJson.result;
    } catch (err: any) {
      this.logger.error(`[CryptoBotClient] Request to ${endpoint} failed: ${err?.message}`);
      throw new BadGatewayException(`CRYPTOBOT_API_ERROR: ${err?.message}`);
    }
  }
}
