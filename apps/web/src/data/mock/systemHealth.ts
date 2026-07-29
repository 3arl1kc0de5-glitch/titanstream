export interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime: string;
  latency: string;
  load: number;
}

export const services: ServiceHealth[] = [
  { name: 'Application', status: 'operational', uptime: '99.99%', latency: '45ms', load: 42 },
  { name: 'Database', status: 'operational', uptime: '99.97%', latency: '12ms', load: 38 },
  { name: 'Queues', status: 'operational', uptime: '99.99%', latency: '5ms', load: 25 },
  { name: 'Workers', status: 'operational', uptime: '99.95%', latency: '—', load: 55 },
  { name: 'Redis', status: 'operational', uptime: '100%', latency: '2ms', load: 30 },
  { name: 'Scheduler', status: 'operational', uptime: '99.99%', latency: '—', load: 15 },
  { name: 'Telegram Bot', status: 'degraded', uptime: '98.50%', latency: '120ms', load: 72 },
  { name: 'Wallet Listener', status: 'operational', uptime: '99.90%', latency: '350ms', load: 48 },
  { name: 'Webhook Processor', status: 'operational', uptime: '99.88%', latency: '80ms', load: 60 },
  { name: 'Operator API', status: 'maintenance', uptime: '97.20%', latency: '200ms', load: 35 },
];
