import type React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

type AlertSeverity = 'low' | 'medium' | 'high';

interface AlertBannerProps {
  message: string;
  severity?: AlertSeverity;
  dismissable?: boolean;
  className?: string;
}

const severityConfig: Record<AlertSeverity, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  low: { icon: <Info size={16} />, bg: 'bg-ton-blue/10', border: 'border-ton-blue/30', text: 'text-ton-blue' },
  medium: { icon: <AlertTriangle size={16} />, bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold' },
  high: { icon: <AlertCircle size={16} />, bg: 'bg-error-red/10', border: 'border-error-red/30', text: 'text-error-red' },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ message, severity = 'medium', dismissable = true, className = '' }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const cfg = severityConfig[severity];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border} ${className}`}>
      <span className={`flex-shrink-0 mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
      <p className="flex-1 text-sm text-text-primary">{message}</p>
      {dismissable && (
        <button onClick={() => setDismissed(true)} className={`flex-shrink-0 ${cfg.text} hover:opacity-70`}>
          <X size={16} />
        </button>
      )}
    </div>
  );
};
