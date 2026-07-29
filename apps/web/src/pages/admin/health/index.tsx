import type React from 'react';
import { useState, useEffect } from 'react';
import { operationsService, type MissionControlData } from '@/services/operationsService';
import { HealthWidget } from '@/components/admin/HealthWidget';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';

export const HealthPage: React.FC = () => {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    operationsService
      .getMissionControlOverview()
      .then((res) => setData(res))
      .catch((err) => console.warn('Failed to load health probes:', err))
      .finally(() => setLoading(false));
  }, []);

  const health = data?.system_health;

  const probeServices = [
    {
      name: 'PostgreSQL Database Engine',
      status: health?.database === 'UP' ? ('operational' as const) : ('down' as const),
      uptime: 99.98,
      latency: 12,
      load: 35,
    },
    {
      name: 'NestJS REST & Gateway API',
      status: health?.api === 'UP' ? ('operational' as const) : ('down' as const),
      uptime: 99.99,
      latency: 18,
      load: 42,
    },
    {
      name: 'Treasury Reserve Pool',
      status: health?.treasury_reserve === 'HEALTHY' ? ('operational' as const) : ('degraded' as const),
      uptime: 100.0,
      latency: 5,
      load: 20,
    },
    {
      name: 'Operations Queue & Worker',
      status: health?.worker_queue === 'HEALTHY' ? ('operational' as const) : ('degraded' as const),
      uptime: 99.9,
      latency: 25,
      load: 48,
    },
  ];

  const operationalCount = probeServices.filter((s) => s.status === 'operational').length;
  const degradedCount = probeServices.filter((s) => s.status !== 'operational').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <MetricCardGrid columns={2}>
        <MetricCard label="Probes Operational" value={operationalCount.toString()} icon="CheckCircle" variant="green" />
        <MetricCard label="Degraded / Attention" value={degradedCount.toString()} icon="AlertTriangle" variant={degradedCount > 0 ? 'gold' : 'green'} />
      </MetricCardGrid>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {probeServices.map((service) => (
          <HealthWidget
            key={service.name}
            name={service.name}
            status={service.status}
            uptime={service.uptime}
            latency={service.latency}
            load={service.load}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card-bg rounded-xl p-3 sm:p-4">
          <h3 className="text-sm font-bold text-text-primary mb-4">System CPU Usage (12h)</h3>
          <div className="h-28 sm:h-32 flex items-end gap-1 sm:gap-2">
            {[35, 42, 38, 55, 48, 62, 58, 45, 52, 48, 40, 38].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-ton-blue/30 rounded-t" style={{ height: `${v * 1.2}px` }} />
                <span className="text-[10px] text-text-tertiary mt-1">{i + 1}h</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card-bg rounded-xl p-3 sm:p-4">
          <h3 className="text-sm font-bold text-text-primary mb-4">System Memory Usage (12h)</h3>
          <div className="h-28 sm:h-32 flex items-end gap-1 sm:gap-2">
            {[42, 48, 45, 52, 58, 55, 50, 48, 44, 52, 48, 45].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-usdt-green/30 rounded-t" style={{ height: `${v * 1.2}px` }} />
                <span className="text-[10px] text-text-tertiary mt-1">{i + 1}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
