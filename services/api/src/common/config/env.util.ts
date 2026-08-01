export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function requiredEnv(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  if (isProduction()) {
    console.error(`[Config] FATAL: Missing required environment variable: ${name}`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback ?? '';
}
