import type React from 'react';
import { useState, useEffect } from 'react';
import { operationsService, type OperationsQueueRecord, type SystemIncidentRecord } from '@/services/operationsService';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { Clock, ArrowUpRight, CheckCircle, RefreshCw, AlertTriangle, ShieldAlert, User, Plus } from 'lucide-react';
import { showToast } from '@/components/Toast';

export const OperationsPage: React.FC = () => {
  const [queueItems, setQueueItems] = useState<OperationsQueueRecord[]>([]);
  const [incidents, setIncidents] = useState<SystemIncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'incidents'>('queue');

  const loadData = async () => {
    setLoading(true);
    try {
      const [qItems, incs] = await Promise.all([
        operationsService.getOperationsQueue(),
        operationsService.getIncidents(),
      ]);
      setQueueItems(qItems);
      setIncidents(incs);
    } catch (err: any) {
      console.warn('Failed to load operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveQueueItem = async (id: string) => {
    try {
      await operationsService.resolveQueueItem(id, 'Resolved via Operations HQ');
      showToast('Queue item resolved successfully', 'success');
      loadData();
    } catch (err: any) {
      showToast('Failed to resolve queue item', 'error');
    }
  };

  const handleRetryQueueItem = async (id: string) => {
    try {
      await operationsService.retryQueueItem(id);
      showToast('Re-triggered queue execution', 'info');
      loadData();
    } catch (err: any) {
      showToast('Failed to retry queue item', 'error');
    }
  };

  const handleResolveIncident = async (id: string) => {
    try {
      await operationsService.resolveIncident(id, 'Mitigated and verified');
      showToast('Incident marked as RESOLVED', 'success');
      loadData();
    } catch (err: any) {
      showToast('Failed to resolve incident', 'error');
    }
  };

  const openQueueCount = queueItems.filter((q) => q.status === 'OPEN').length;
  const activeIncidentCount = incidents.filter((i) => i.status !== 'RESOLVED').length;

  return (
    <div className="space-y-4">
      <MetricCardGrid columns={2}>
        <MetricCard label="Operations Queue" value={openQueueCount.toString()} change={0} icon="Clock" variant="gold" />
        <MetricCard label="Active Incidents" value={activeIncidentCount.toString()} change={0} icon="ShieldAlert" variant="red" />
      </MetricCardGrid>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'queue' ? 'bg-usdt-green/15 text-usdt-green border border-usdt-green/30' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Operations Queue ({openQueueCount})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'incidents' ? 'bg-error-red/15 text-error-red border border-error-red/30' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          System Incidents ({activeIncidentCount})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-text-tertiary">Loading operational records...</div>
      ) : activeTab === 'queue' ? (
        <div className="space-y-3">
          {queueItems.map((item) => (
            <div key={item.id} className="bg-card-bg rounded-xl p-4 border border-border/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary">{item.reason}</span>
                  <StatusBadge label={item.status} variant={item.status === 'RESOLVED' ? 'success' : 'warning'} dot />
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">
                  {new Date(item.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-text-secondary font-mono bg-app-bg p-2 rounded-lg border border-white/5 truncate">
                {JSON.stringify(item.payload)}
              </p>
              {item.status === 'OPEN' && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleRetryQueueItem(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                  <button
                    onClick={() => handleResolveQueueItem(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-usdt-green text-app-bg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle size={12} /> Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
          {queueItems.length === 0 && (
            <div className="text-center py-8 text-xs text-text-tertiary">Operations Queue is clear (0 failure items)</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="bg-card-bg rounded-xl p-4 border border-border/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-text-primary">{inc.reference}: {inc.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inc.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gold/20 text-gold border border-gold/30'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <StatusBadge label={inc.status} variant={inc.status === 'RESOLVED' ? 'success' : 'danger'} dot />
              </div>
              <p className="text-xs text-text-secondary">{inc.description}</p>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary font-mono pt-1">
                <span>Component: {inc.affectedComponent}</span>
                <span>Owner: {inc.ownerName || 'Unassigned'}</span>
              </div>
              {inc.status !== 'RESOLVED' && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleResolveIncident(inc.id)}
                    className="px-3 py-1.5 rounded-lg bg-usdt-green text-app-bg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle size={12} /> Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
          {incidents.length === 0 && (
            <div className="text-center py-8 text-xs text-text-tertiary">No active system incidents reported</div>
          )}
        </div>
      )}
    </div>
  );
};
