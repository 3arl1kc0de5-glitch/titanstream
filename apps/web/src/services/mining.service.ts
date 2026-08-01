import { api, type ApiResponse } from './api';

export interface MiningStateResponse {
  activeCurrency: 'USDT' | 'TON';
  baseSpeedGhs: number;
  coolerMultiplier: number;
  unclaimedBalance: number;
  machineMode: 'PROMOTIONAL' | 'STANDARD';
  lifetimePromotionalOutput: number;
  interactivePromotionalOutput: number;
  isOverheated: boolean;
  cooldownRemaining: number;
  tapYieldPerTap: number;
}

export const miningService = {
  /**
   * Fetch current user mining state from the backend.
   * Backend endpoint: GET /mining/state
   */
  async getMiningState(): Promise<ApiResponse<MiningStateResponse>> {
    const response = await api.get('/mining/state');
    return response.data;
  },

  /**
   * Tap the cooling multiplier. The backend computes the credited yield.
   * Backend endpoint: POST /mining/tap
   */
  async tapCooler(): Promise<ApiResponse<MiningStateResponse>> {
    const response = await api.post('/mining/tap');
    return response.data;
  },

  /**
   * Toggle active mining asset.
   * Backend endpoint: POST /mining/toggle
   */
  async toggleCurrency(currency: 'USDT' | 'TON'): Promise<ApiResponse<MiningStateResponse>> {
    const response = await api.post('/mining/toggle', { currency });
    return response.data;
  },

  /**
   * Claim accumulated mining yield to double-entry ledger balance.
   * Backend endpoint: POST /mining/claim
   */
  async claimRewards(): Promise<ApiResponse<{ success: boolean; amount: string; session: MiningStateResponse }>> {
    const response = await api.post('/mining/claim');
    return response.data;
  },
};
