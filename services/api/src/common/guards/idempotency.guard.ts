import { Injectable, CanActivate, ExecutionContext, ConflictException, BadRequestException } from '@nestjs/common';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  private readonly processedKeys = new Map<string, { timestamp: number; response?: any }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = 
      request.headers['x-idempotency-key'] || 
      request.headers['idempotency-key'] || 
      request.body?.idempotencyKey;

    if (!idempotencyKey) {
      // If endpoint strictly requires idempotency, enforce header
      return true;
    }

    const keyStr = String(idempotencyKey).trim();
    if (this.processedKeys.has(keyStr)) {
      const existing = this.processedKeys.get(keyStr)!;
      // Key collision detected within 24-hour window
      if (Date.now() - existing.timestamp < 24 * 60 * 60 * 1000) {
        throw new ConflictException(
          `IDEMPOTENCY_KEY_COLLISION: Idempotency key '${keyStr}' has already been processed.`
        );
      }
    }

    // Register key with timestamp
    this.processedKeys.set(keyStr, { timestamp: Date.now() });

    // Clean up expired keys periodically
    if (this.processedKeys.size > 10000) {
      const now = Date.now();
      for (const [k, v] of this.processedKeys.entries()) {
        if (now - v.timestamp > 24 * 60 * 60 * 1000) {
          this.processedKeys.delete(k);
        }
      }
    }

    return true;
  }
}
