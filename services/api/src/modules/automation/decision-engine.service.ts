import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, PlatformEvent } from './event-bus.service';
import { NotificationService } from '../notification/notification.service';
import { IncidentEngineService } from '../admin/services/incident-engine.service';

export type RuleActionType = 
  | 'AUTO_APPROVE' 
  | 'FLAG_RISK_REVIEW' 
  | 'EMIT_NOTIFICATION' 
  | 'CREATE_SYSTEM_INCIDENT' 
  | 'ENFORCE_SETTLEMENT_LOCK';

export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
  value: any;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  eventPattern: string; // e.g., 'PaymentOrderCreated', 'WithdrawalRequested', 'TreasuryHealthChanged'
  conditions: RuleCondition[];
  actions: RuleActionType[];
  isEnabled: boolean;
  priority: number; // lower number = higher priority
  createdAt: string;
  updatedAt: string;
}

export interface AutomationEvaluationRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  eventPattern: string;
  inputPayload: any;
  conditionsMet: boolean;
  executedActions: RuleActionType[];
  evaluatedAt: string;
}

@Injectable()
export class DecisionEngineService implements OnModuleInit {
  private readonly logger = new Logger(DecisionEngineService.name);

  private readonly rules = new Map<string, AutomationRule>();
  private readonly evaluations: AutomationEvaluationRecord[] = [];

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly incidentEngine: IncidentEngineService,
  ) {
    // Pre-populate core operational decision rules
    this.seedDefaultRules();
  }

  onModuleInit() {
    this.logger.log('Decision Engine active. Listening to EventBus triggers...');

    // Subscribe to all event bus channels
    this.eventBus.on('PaymentOrderCreated').subscribe({
      next: (event) => this.evaluateEvent('PaymentOrderCreated', event.payload),
    });

    this.eventBus.on('WithdrawalRequested').subscribe({
      next: (event) => this.evaluateEvent('WithdrawalRequested', event.payload),
    });

    this.eventBus.on('SettlementCompleted').subscribe({
      next: (event) => this.evaluateEvent('SettlementCompleted', event.payload),
    });
  }

  private seedDefaultRules() {
    const defaultRules: AutomationRule[] = [
      {
        id: 'rule_large_deposit_flag',
        name: 'Flag Large Payment Orders',
        description: 'Flags payment orders exceeding $500 USDT for operator verification',
        eventPattern: 'PaymentOrderCreated',
        conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 500 }],
        actions: ['FLAG_RISK_REVIEW', 'EMIT_NOTIFICATION'],
        isEnabled: true,
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule_withdrawal_reserve_check',
        name: 'Withdrawal Reserve Guard',
        description: 'Notifies Treasury Duty engineer on withdrawals exceeding $100 USDT',
        eventPattern: 'WithdrawalRequested',
        conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 100 }],
        actions: ['EMIT_NOTIFICATION'],
        isEnabled: true,
        priority: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule_auto_approve_micro_deposit',
        name: 'Auto-Approve Micro Payment Orders',
        description: 'Automatically approves verified mobile money deposits under $20 USDT',
        eventPattern: 'PaymentOrderCreated',
        conditions: [{ field: 'amount', operator: 'LESS_THAN', value: 20 }],
        actions: ['AUTO_APPROVE'],
        isEnabled: true,
        priority: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    defaultRules.forEach((r) => this.rules.set(r.id, r));
  }

  getRules(): AutomationRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.priority - b.priority);
  }

  getRule(id: string): AutomationRule | undefined {
    return this.rules.get(id);
  }

  createRule(dto: Partial<AutomationRule>): AutomationRule {
    const id = `rule_${Date.now()}`;
    const newRule: AutomationRule = {
      id,
      name: dto.name || 'Custom Decision Rule',
      description: dto.description || '',
      eventPattern: dto.eventPattern || 'PaymentOrderCreated',
      conditions: dto.conditions || [],
      actions: dto.actions || ['EMIT_NOTIFICATION'],
      isEnabled: dto.isEnabled ?? true,
      priority: dto.priority || 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(id, newRule);
    return newRule;
  }

  updateRule(id: string, dto: Partial<AutomationRule>): AutomationRule {
    const existing = this.rules.get(id);
    if (!existing) throw new Error('RULE_NOT_FOUND');
    const updated = { ...existing, ...dto, updatedAt: new Date().toISOString() };
    this.rules.set(id, updated);
    return updated;
  }

  toggleRule(id: string): AutomationRule {
    const existing = this.rules.get(id);
    if (!existing) throw new Error('RULE_NOT_FOUND');
    existing.isEnabled = !existing.isEnabled;
    existing.updatedAt = new Date().toISOString();
    this.rules.set(id, existing);
    return existing;
  }

  getEvaluations(): AutomationEvaluationRecord[] {
    return this.evaluations.slice(-50).reverse();
  }

  evaluateEvent(eventPattern: string, payload: any): AutomationEvaluationRecord[] {
    const matchingRules = this.getRules().filter((r) => r.isEnabled && r.eventPattern === eventPattern);
    const records: AutomationEvaluationRecord[] = [];

    for (const rule of matchingRules) {
      const conditionsMet = this.checkConditions(rule.conditions, payload);
      const executedActions: RuleActionType[] = [];

      if (conditionsMet) {
        this.executeActions(rule.actions, payload);
        executedActions.push(...rule.actions);
      }

      const rec: AutomationEvaluationRecord = {
        id: `eval_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        eventPattern,
        inputPayload: payload,
        conditionsMet,
        executedActions,
        evaluatedAt: new Date().toISOString(),
      };

      this.evaluations.push(rec);
      records.push(rec);
    }

    return records;
  }

  private checkConditions(conditions: RuleCondition[], payload: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((c) => {
      const val = payload?.[c.field];
      if (val === undefined) return false;

      switch (c.operator) {
        case 'EQUALS':
          return val === c.value;
        case 'NOT_EQUALS':
          return val !== c.value;
        case 'GREATER_THAN':
          return Number(val) > Number(c.value);
        case 'LESS_THAN':
          return Number(val) < Number(c.value);
        case 'CONTAINS':
          return String(val).toLowerCase().includes(String(c.value).toLowerCase());
        default:
          return false;
      }
    });
  }

  private executeActions(actions: RuleActionType[], payload: any) {
    for (const action of actions) {
      this.logger.log(`[DecisionEngine] Executing Action: ${action} for payload`, payload);

      if (action === 'CREATE_SYSTEM_INCIDENT') {
        this.incidentEngine.createIncident({
          title: `Automated Trigger: ${payload?.reason || 'Policy Threshold Exceeded'}`,
          description: `Decision Engine executed rule action for event payload: ${JSON.stringify(payload)}`,
          severity: 'HIGH',
          affectedComponent: 'Automation Engine',
        });
      }
    }
  }
}
