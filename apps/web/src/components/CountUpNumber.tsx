import React, { useEffect, useState } from 'react';

interface CountUpNumberProps {
  endValue: number;
  durationMs?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  endValue = 0,
  durationMs = 1200,
  formatter = (val) => (Number(val) || 0).toLocaleString(),
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  const safeEndValue = Number(endValue) || 0;

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      
      // Ease-out cubic curve for smooth acceleration and deceleration
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easeOutProgress * safeEndValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [safeEndValue, durationMs]);

  const safeDisplayValue = Number(displayValue) || 0;
  const formattedText = formatter ? formatter(safeDisplayValue) : safeDisplayValue.toLocaleString();

  return <span className={className}>{formattedText}</span>;
};
