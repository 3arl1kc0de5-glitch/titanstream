export interface GeneralSetting {
  key: string;
  label: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
}

export const generalSettings: GeneralSetting[] = [
  { key: 'platform_name', label: 'Platform Name', value: 'TitanStream', type: 'text' },
  { key: 'default_fee', label: 'Default Fee (%)', value: 1.5, type: 'number' },
  { key: 'min_order', label: 'Min Order Amount (USDT)', value: 10, type: 'number' },
  { key: 'max_order', label: 'Max Order Amount (USDT)', value: 50000, type: 'number' },
  { key: 'maintenance_mode', label: 'Maintenance Mode', value: false, type: 'boolean' },
  { key: 'auto_settle', label: 'Auto Settlement', value: true, type: 'boolean' },
  { key: 'default_currency', label: 'Default Currency', value: 'USDT', type: 'select', options: ['USDT', 'USDC', 'TON', 'BTC'] },
];

export const supportedCountries: string[] = ['US', 'UK', 'NG', 'BR', 'IN', 'CN', 'KR', 'VN', 'GH', 'KE', 'MX', 'RU', 'SG', 'CH', 'JP'];
export const supportedCurrencies: string[] = ['USDT', 'USDC', 'TON', 'BTC', 'ETH', 'BNB'];
export const supportedNetworks: string[] = ['TRC-20', 'ERC-20', 'BEP-20', 'TON', 'Polygon', 'Solana'];
export const supportedPaymentMethods: string[] = ['Mobile Money', 'Bank Transfer', 'CryptoBot', 'Card', 'PIX'];
