export type CryptoBotNetwork = 'mainnet' | 'testnet';

export interface CryptoBotConfig {
  apiToken: string;
  network: CryptoBotNetwork;
}

export interface CryptoBotInvoicePayload {
  asset: string;
  amount: string;
  description?: string;
  hidden_message?: string;
  paid_btn_name?: 'viewItem' | 'openChannel' | 'openBot' | 'callback';
  paid_btn_url?: string;
  payload?: string;
  allow_comments?: boolean;
  allow_anonymous?: boolean;
  expires_in?: number;
}

export interface CryptoBotInvoiceResponse {
  invoice_id: number;
  hash: string;
  currency_type: string;
  asset: string;
  amount: string;
  pay_url: string;
  bot_invoice_url: string;
  mini_app_invoice_url: string;
  web_app_invoice_url: string;
  status: 'active' | 'paid' | 'expired';
  created_at: string;
  paid_at?: string;
  allow_comments: boolean;
  allow_anonymous: boolean;
  expiration_date?: string;
  description?: string;
  hidden_message?: string;
  payload?: string;
}

export interface CryptoBotApiResponse<T> {
  ok: boolean;
  result: T;
  error?: {
    code: number;
    name: string;
  };
}

export interface CryptoBotWebhookPayload {
  update_id: number;
  update_type: 'invoice_paid';
  request_date: string;
  payload: CryptoBotInvoiceResponse;
}
