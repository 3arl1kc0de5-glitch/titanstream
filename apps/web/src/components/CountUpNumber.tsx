import React, { useEffect, useState } from 'react';

interface CountUpNumberProps {
  endValue: number;
  durationMs?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  endValue,
  durationMs = 1200,
  formatter = (val) => val.toLocaleString(),
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      
      // Ease-out cubic curve for smooth acceleration and deceleration
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easeOutProgress * endValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [endValue, durationMs]);

  return <span className={className}>{formatter(displayValue)}</span>;
};
