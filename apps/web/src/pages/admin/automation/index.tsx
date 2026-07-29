import type React from 'react';
import { useState, useEffect } from 'react';
import { automationService, type AutomationRuleRecord, type AutomationEvaluationLog } from '@/services/automationService';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { Zap, Activity, CheckCircle2, Play, Plus, ArrowRight, ShieldCheck, Clock, Settings, RefreshCw } from 'lucide-react';
import { showToast } from '@/components/Toast';

export const AutomationPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRuleRecord[]>([]);
  const [evaluations, setEvaluations] = useState<AutomationEvaluationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [eventPattern, setEventPattern] = useState('PaymentOrderCreated');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rList, evList] = await Promise.all([
        automationService.getRules(),
        automationService.getEvaluations(),
      ]);
      setRules(rList);
      setEvaluations(evList);
    } catch (err: any) {
      console.warn('Failed to load automation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRule = async (id: string) => {
    try {
      const updated = await automationService.toggleRule(id);
      setRules(rules.map((r) => (r.id === id ? updated : r)));
      showToast(`Rule "${updated.name}" is now ${updated.isEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
    } catch (err: any) {
      showToast('Failed to toggle rule', 'error');
    }
  };

  const handleTestTrigger = async () => {
    try {
      const results = await automationService.evaluateDryRun('PaymentOrderCreated', {
        orderId: 'ORD-TEST-999',
        amount: 750,
        currency: 'USDT',
        paymentMethod: 'MOBILE_MONEY',
      });
      showToast(`Evaluated test payload against ${results.length} active rules`, 'success');
      loadData();
    } catch (err: any) {
      showToast('Test evaluation failed', 'error');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    try {
      const newRule = await automationService.createRule({
        name: ruleName.trim(),
        description: 'Operator configured rule',
        eventPattern,
        conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 100 }],
        actions: ['EMIT_NOTIFICATION', 'FLAG_RISK_REVIEW'],
        isEnabled: true,
        priority: 5,
      });

      setRules([...rules, newRule]);
      setRuleName('');
      setCreateModalOpen(false);
      showToast(`Automation Rule "${newRule.name}" created!`, 'success');
    } catch (err: any) {
      showToast('Failed to create rule', 'error');
    }
  };

  const enabledRulesCount = rules.filter((r) => r.isEnabled).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <MetricCardGrid columns={3}>
        <MetricCard label="Active Rules" value={enabledRulesCount.toString()} icon="Zap" variant="green" />
        <MetricCard label="Evaluations Logged" value={evaluations.length.toString()} icon="Activity" variant="blue" />
        <MetricCard label="Engine Health" value="100% Reliable" icon="CheckCircle" variant="gold" />
      </MetricCardGrid>

      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card-bg p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <Zap size={18} className="text-usdt-green" /> Centralized Automation & Rules Engine
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Event-driven risk policies evaluating incoming platform events against active rules and executing automated actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestTrigger}
            className="px-3 py-2 rounded-xl bg-usdt-green/20 hover:bg-usdt-green/30 border border-usdt-green/40 text-usdt-green font-bold text-xs flex items-center gap-1.5 press-feedback cursor-pointer"
          >
            <Play size={14} /> Dry-Run Test Payload
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center gap-1.5 shadow-md press-feedback cursor-pointer"
          >
            <Plus size={16} /> New Rule
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-card-bg rounded-2xl p-4 border border-white/10 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-text-primary">{rule.name}</h3>
                <span className="text-[10px] font-mono text-usdt-green bg-usdt-green/20 px-2 py-0.5 rounded-full border border-usdt-green/30">
                  Trigger: {rule.eventPattern}
                </span>
              </div>

              <button
                onClick={() => handleToggleRule(rule.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${
                  rule.isEnabled
                    ? 'bg-usdt-green text-app-bg shadow-sm'
                    : 'bg-white/5 text-text-tertiary border border-white/10'
                }`}
              >
                {rule.isEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <p className="text-xs text-text-secondary">{rule.description}</p>

            <div className="p-2.5 rounded-xl bg-control-bg/60 border border-white/5 font-mono text-[11px] text-text-tertiary">
              <span className="text-text-primary font-bold">IF</span> conditions:{' '}
              <span className="text-usdt-green font-bold">
                {rule.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(' AND ')}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Actions:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {rule.actions.map((act, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-text-secondary">
                    ⚡ {act}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Decision Audit Log Stream */}
      <div className="bg-card-bg rounded-2xl p-4 border border-white/10 space-y-3">
        <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
          <Activity size={16} className="text-usdt-green" /> Decision Evaluation History Logs
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {evaluations.map((log) => (
            <div key={log.id} className="bg-control-bg/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${log.conditionsMet ? 'bg-usdt-green' : 'bg-white/20'}`} />
                <span className="font-bold text-text-primary">{log.ruleName}</span>
                <span className="text-text-tertiary">({log.eventPattern})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-usdt-green font-bold">
                  {log.conditionsMet ? `Executed: ${log.executedActions.join(', ')}` : 'Conditions Not Met'}
                </span>
                <span className="text-[10px] text-text-tertiary">{new Date(log.evaluatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
          {evaluations.length === 0 && (
            <div className="text-center py-6 text-xs text-text-tertiary">No evaluation logs recorded yet</div>
          )}
        </div>
      </div>

      {/* Create Rule Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-app-bg border border-white/10 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-text-primary">Create Decision Rule</h3>
            <form onSubmit={handleCreateRule} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-tertiary">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g., Flag High Volume Deposits"
                  className="w-full h-10 px-3 bg-control-bg border border-white/10 rounded-xl text-xs text-text-primary focus:outline-none focus:border-usdt-green"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-tertiary">Event Trigger</label>
                <select
                  value={eventPattern}
                  onChange={(e) => setEventPattern(e.target.value)}
                  className="w-full h-10 px-3 bg-control-bg border border-white/10 rounded-xl text-xs text-text-primary focus:outline-none focus:border-usdt-green"
                >
                  <option value="PaymentOrderCreated">PaymentOrderCreated</option>
                  <option value="WithdrawalRequested">WithdrawalRequested</option>
                  <option value="SettlementCompleted">SettlementCompleted</option>
                  <option value="TreasuryHealthChanged">TreasuryHealthChanged</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg text-xs font-extrabold"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
