import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoBotSignatureService {
  private readonly logger = new Logger(CryptoBotSignatureService.name);

  /**
   * Verify the authenticity of an incoming CryptoBot webhook request.
   * Signature formula: HMAC-SHA256 of raw body using SHA256(apiToken) as secret key.
   */
  verifySignature(rawBody: string | Buffer, headerSignature: string, apiToken: string): boolean {
    if (!apiToken || !headerSignature) {
      this.logger.warn('[CryptoBotSignature] Missing API token or header signature');
      return false;
    }

    try {
      const secretKey = crypto.createHash('sha256').update(apiToken).digest();
      const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      const calculatedSignature = crypto.createHmac('sha256', secretKey).update(bodyString).digest('hex');

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(calculatedSignature, 'hex'),
        Buffer.from(headerSignature, 'hex'),
      );

      if (!isMatch) {
        this.logger.error('[CryptoBotSignature] Signature mismatch for CryptoBot webhook request');
      }

      return isMatch;
    } catch (err: any) {
      this.logger.error(`[CryptoBotSignature] Error verifying signature: ${err?.message}`);
      return false;
    }
  }

  validateOrThrow(rawBody: string | Buffer, headerSignature: string, apiToken: string): void {
    const isValid = this.verifySignature(rawBody, headerSignature, apiToken);
    if (!isValid) {
      throw new UnauthorizedException('INVALID_CRYPTOBOT_WEBHOOK_SIGNATURE');
    }
  }
}
