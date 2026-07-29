import { api } from './api';

export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
  value: any;
}

export interface AutomationRuleRecord {
  id: string;
  name: string;
  description: string;
  eventPattern: string;
  conditions: RuleCondition[];
  actions: string[];
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationEvaluationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  eventPattern: string;
  inputPayload: any;
  conditionsMet: boolean;
  executedActions: string[];
  evaluatedAt: string;
}

export const automationService = {
  async getRules(): Promise<AutomationRuleRecord[]> {
    const res = await api.get('/admin/automation/rules');
    return res.data.data;
  },

  async createRule(dto: Partial<AutomationRuleRecord>): Promise<AutomationRuleRecord> {
    const res = await api.post('/admin/automation/rules', dto);
    return res.data.data;
  },

  async updateRule(id: string, dto: Partial<AutomationRuleRecord>): Promise<AutomationRuleRecord> {
    const res = await api.put(`/admin/automation/rules/${id}`, dto);
    return res.data.data;
  },

  async toggleRule(id: string): Promise<AutomationRuleRecord> {
    const res = await api.post(`/admin/automation/rules/${id}/toggle`);
    return res.data.data;
  },

  async getEvaluations(): Promise<AutomationEvaluationLog[]> {
    const res = await api.get('/admin/automation/evaluations');
    return res.data.data;
  },

  async evaluateDryRun(eventPattern: string, payload: any): Promise<AutomationEvaluationLog[]> {
    const res = await api.post('/admin/automation/evaluate', { eventPattern, payload });
    return res.data.data;
  },
};
