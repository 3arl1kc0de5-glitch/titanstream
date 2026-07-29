import type React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'white' | 'blue';
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  color = 'green',
  className = '',
}) => {
  const sizeMap = { sm: 16, md: 24, lg: 40 };
  const colorMap = {
    green: 'border-usdt-green',
    white: 'border-white',
    blue: 'border-ton-blue',
  };

  return (
    <div
      className={`inline-block rounded-full border-2 border-t-transparent animate-spin ${colorMap[color]} ${className}`}
      style={{ width: sizeMap[size], height: sizeMap[size] }}
      role="status"
      aria-label="Loading"
    />
  );
};

/** Full-screen loading overlay */
export const FullScreenLoader: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4">
      <Loader size="lg" />
      <span className="text-sm text-text-secondary">Loading...</span>
    </div>
  </div>
);
