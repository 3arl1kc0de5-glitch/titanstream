export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  status: 'enabled' | 'disabled' | 'error';
  executionCount: number;
  successRate: number;
  lastExecution: string;
}

export const automationRules: AutomationRule[] = [
  { id: 'AR-001', name: 'High Risk Auto-Hold', description: 'Automatically hold orders exceeding risk threshold', trigger: 'order.risk_score > 80', conditions: ['Risk score > 80', 'Order value > $1,000'], actions: ['Set status to "held"', 'Notify risk team via Telegram', 'Flag user for review'], status: 'enabled', executionCount: 1452, successRate: 99.2, lastExecution: '2m ago' },
  { id: 'AR-002', name: 'Operator Fallback', description: 'Route to backup operator on primary failure', trigger: 'operator.timeout > 30s', conditions: ['Primary operator timeout > 30s'], actions: ['Route to next available operator', 'Notify primary operator'], status: 'enabled', executionCount: 893, successRate: 97.8, lastExecution: '5m ago' },
  { id: 'AR-003', name: 'Liquidity Rebalance', description: 'Auto-rebalance when wallet dips below threshold', trigger: 'wallet.balance < threshold', conditions: ['Wallet balance < 10% of reserve'], actions: ['Transfer from treasury', 'Log rebalance event', 'Notify treasury team'], status: 'enabled', executionCount: 234, successRate: 100, lastExecution: '1h 15m ago' },
  { id: 'AR-004', name: 'Velocity Throttle', description: 'Throttle user after exceeding velocity limits', trigger: 'user.velocity_5m > 10', conditions: ['5-minute transaction count > 10'], actions: ['Reduce user rate limit', 'Add velocity flag', 'Notify fraud team'], status: 'disabled', executionCount: 567, successRate: 95.5, lastExecution: '1d ago' },
  { id: 'AR-005', name: 'Daily Settlement', description: 'Batch settle all completed orders daily', trigger: 'cron.daily 00:00', conditions: ['Order status = completed', 'Settlement pending'], actions: ['Create batch', 'Execute settlement', 'Update order status', 'Notify operators'], status: 'enabled', executionCount: 210, successRate: 100, lastExecution: '12h ago' },
];
