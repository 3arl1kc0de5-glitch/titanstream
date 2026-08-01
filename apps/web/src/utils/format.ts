/**
 * Adaptive counter formatting: as the integer part grows, decimal places are
 * trimmed so the counter keeps ~5 significant digits at every magnitude.
 * Above 1.0 each order of magnitude removes one decimal place
 * (1.2345 -> 12.345 -> 123.45 -> 1234.5 -> 12345); below 1.0 more decimals
 * are shown so tiny earnings stay visible.
 */
export const formatAdaptiveCounter = (val: number): string => {
  const safe = Number(val) || 0;
  const abs = Math.abs(safe);

  let decimals: number;
  if (abs === 0) {
    decimals = 4;
  } else if (abs < 0.0001) {
    decimals = 8;
  } else if (abs < 0.001) {
    decimals = 7;
  } else if (abs < 0.01) {
    decimals = 6;
  } else if (abs < 0.1) {
    decimals = 5;
  } else if (abs < 10) {
    decimals = 4;
  } else if (abs < 100) {
    decimals = 3;
  } else if (abs < 1000) {
    decimals = 2;
  } else if (abs < 10000) {
    decimals = 1;
  } else {
    decimals = 0;
  }

  return safe.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
