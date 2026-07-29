import { create } from 'zustand';

export interface AutomationAction {
  id: string;
  type: 'Notification' | 'ReferralCheck' | 'TreasuryAllocate' | 'UpdateAnalytics' | 'TelegramMessage' | 'AuditLog';
  params: Record<string, string>;
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerEvent: string;
  condition: string;
  actions: AutomationAction[];
  status: 'enabled' | 'disabled';
  executionCount: number;
  lastExecutedAt?: string;
}

export interface ExecutionLog {
  id: string;
  ruleName: string;
  triggerEvent: string;
  status: 'SUCCESS' | 'FAILED';
  executedAt: string;
  durationMs: number;
  details: string;
}

interface AutomationState {
  rules: AutomationRule[];
  executionLogs: ExecutionLog[];
  
  // Actions
  toggleRule: (id: string) => void;
  addRule: (rule: Omit<AutomationRule, 'id' | 'executionCount'>) => void;
  executeTrigger: (event: string, payload?: any) => void;
}

const INITIAL_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Deposit Approval Workflow',
    triggerEvent: 'Deposit Approved',
    condition: 'amount >= 10.00',
    status: 'enabled',
    executionCount: 1420,
    lastExecutedAt: new Date(Date.now() - 300000).toISOString(),
    actions: [
      { id: 'a1', type: 'ReferralCheck', params: { target: 'Uploader' } },
      { id: 'a2', type: 'Notification', params: { channel: 'InApp', template: 'DepositAccredited' } },
      { id: 'a3', type: 'TelegramMessage', params: { channel: 'PrivateGroup' } },
      { id: 'a4', type: 'AuditLog', params: { level: 'INFO' } },
    ],
  },
  {
    id: 'rule-2',
    name: 'Machine Activation & Capacity Allocation',
    triggerEvent: 'Machine Activated',
    condition: 'tierId != null',
    status: 'enabled',
    executionCount: 890,
    lastExecutedAt: new Date(Date.now() - 1200000).toISOString(),
    actions: [
      { id: 'b1', type: 'TreasuryAllocate', params: { pool: 'CloudExpansion' } },
      { id: 'b2', type: 'Notification', params: { template: 'MachineActive' } },
      { id: 'b3', type: 'UpdateAnalytics', params: { metric: 'Hashrate' } },
    ],
  },
  {
    id: 'rule-3',
    name: 'Daily Reward Cycle Auto-Dispatch',
    triggerEvent: 'Reward Cycle Finished',
    condition: 'rewardTotal > 0',
    status: 'enabled',
    executionCount: 310,
    lastExecutedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    actions: [
      { id: 'c1', type: 'Notification', params: { template: 'DailyRewardSummary' } },
      { id: 'c2', type: 'TelegramMessage', params: { channel: 'PublicChannel' } },
    ],
  },
  {
    id: 'rule-4',
    name: '7-Day Inactive Re-engagement',
    triggerEvent: 'User Inactive 7 Days',
    condition: 'usdtBalance > 0',
    status: 'enabled',
    executionCount: 54,
    lastExecutedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    actions: [
      { id: 'd1', type: 'Notification', params: { template: 'ReengagementQuest' } },
    ],
  },
];

const INITIAL_LOGS: ExecutionLog[] = [
  {
    id: 'log-1',
    ruleName: 'Deposit Approval Workflow',
    triggerEvent: 'Deposit Approved',
    status: 'SUCCESS',
    executedAt: new Date(Date.now() - 300000).toISOString(),
    durationMs: 45,
    details: 'Triggered actions: ReferralCheck, Notification, TelegramMessage, AuditLog. 4/4 executed.',
  },
  {
    id: 'log-2',
    ruleName: 'Machine Activation & Capacity Allocation',
    triggerEvent: 'Machine Activated',
    status: 'SUCCESS',
    executedAt: new Date(Date.now() - 1200000).toISOString(),
    durationMs: 62,
    details: 'Allocated +120 Compute Units in Cloud Expansion Pool.',
  },
];

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: INITIAL_RULES,
  executionLogs: INITIAL_LOGS,

  toggleRule: (id) =>
    set((state) => ({
      rules: state.rules.map((r) => (r.id === id ? { ...r, status: r.status === 'enabled' ? 'disabled' : 'enabled' } : r)),
    })),

  addRule: (ruleData) => {
    const newRule: AutomationRule = {
      ...ruleData,
      id: `rule-${Date.now()}`,
      executionCount: 0,
    };
    set((state) => ({ rules: [newRule, ...state.rules] }));
  },

  executeTrigger: (event, payload) => {
    const activeRules = get().rules.filter((r) => r.triggerEvent === event && r.status === 'enabled');
    const now = new Date().toISOString();

    const newLogs: ExecutionLog[] = activeRules.map((rule) => ({
      id: `log-${Date.now()}-${rule.id}`,
      ruleName: rule.name,
      triggerEvent: event,
      status: 'SUCCESS',
      executedAt: now,
      durationMs: Math.floor(20 + Math.random() * 50),
      details: `Executed ${rule.actions.length} action pipeline on payload event: ${event}.`,
    }));

    set((state) => ({
      rules: state.rules.map((r) =>
        r.triggerEvent === event && r.status === 'enabled'
          ? { ...r, executionCount: r.executionCount + 1, lastExecutedAt: now }
          : r
      ),
      executionLogs: [...newLogs, ...state.executionLogs],
    }));
  },
}));
