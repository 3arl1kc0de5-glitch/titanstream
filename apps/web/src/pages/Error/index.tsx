import type React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/Button';

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message = 'An unexpected error occurred while connecting to Telegram.',
  onRetry,
}) => {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-error-red/15 text-error-red flex items-center justify-center mb-4">
        <AlertTriangle size={32} />
      </div>

      <h1 className="text-title text-text-primary mb-2">Connection Error</h1>
      <p className="text-body max-w-xs mb-6">{message}</p>

      <Button
        variant="primary"
        icon={<RefreshCw size={18} />}
        onClick={() => onRetry?.() || window.location.reload()}
      >
        Reload App
      </Button>
    </div>
  );
};
