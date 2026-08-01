import type React from 'react';
import { ActivityItem } from './ActivityItem';

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  title?: string;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, title = 'Live Activity', className = '' }) => (
  <div className={`bg-card-bg rounded-xl p-4 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-text-primary">{title}</h3>
      <span className="flex items-center gap-1.5 text-xs text-usdt-green">
        <span className="w-2 h-2 rounded-full bg-usdt-green animate-pulse" />
        Live
      </span>
    </div>
    <div className="divide-y divide-border/50">
      {events.map((event) => (
        <ActivityItem
          key={event.id}
          type={event.type}
          message={event.message}
          timestamp={event.timestamp}
          severity={event.severity}
        />
      ))}
    </div>
  </div>
);
