import { useRef, useEffect, useState } from 'react';

interface CounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

/**
 * Odometer-style animated counter.
 * Uses requestAnimationFrame for smooth 60fps updates.
 */
export const Counter: React.FC<CounterProps> = ({
  value,
  decimals = 6,
  suffix = '',
  className = '',
  animate = true,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number>(0);
  const startValueRef = useRef(value);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();
    const duration = 500; // ms

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animate]);

  return (
    <span className={`tabular-nums ${className}`}>
      {(Number(displayValue) || 0).toFixed(decimals)}{suffix}
    </span>
  );
};
