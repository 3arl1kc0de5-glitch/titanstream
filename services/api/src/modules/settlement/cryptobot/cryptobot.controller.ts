import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { CryptoBotSignatureService } from './cryptobot.signature.service';
import { CryptoBotReconciliationService } from './cryptobot.reconciliation.service';
import { CryptoBotClient } from './cryptobot.client';
import { Public } from '../../../common/decorators/public.decorator';
import { IdempotencyService } from '../../financial-orchestration/idempotency.service';
import { OperationsQueueStatus } from '@prisma/client';

@Controller('settlement/cryptobot')
export class CryptoBotController {
  private readonly logger = new Logger(CryptoBotController.name);

  constructor(
    private readonly signatureService: CryptoBotSignatureService,
    private readonly reconciliationService: CryptoBotReconciliationService,
    private readonly client: CryptoBotClient,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('crypto-pay-api-signature') signature: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    this.logger.log(`[CryptoBotWebhook] Received update_type: ${body?.update_type}, update_id: ${body?.update_id}`);

    // 1. Signature verification
    const apiToken = this.client.getApiToken();
    if (apiToken) {
      if (!signature) {
        this.logger.error('[CryptoBotWebhook] Missing signature header');
        throw new UnauthorizedException('MISSING_SIGNATURE');
      }
      const rawBody = req.rawBody || JSON.stringify(body);
      try {
        this.signatureService.validateOrThrow(rawBody, signature, apiToken);
      } catch (err: any) {
        this.logger.error(`[CryptoBotWebhook] Signature verification failed: ${err?.message}`);
        throw new UnauthorizedException('INVALID_SIGNATURE');
      }
    } else {
      this.logger.warn('[CryptoBotWebhook] No CRYPTOBOT_API_TOKEN set. Skipping signature verification (testing mode).');
    }

    const updateId = body?.update_id;
    if (!updateId) {
      return { status: 'ERROR', message: 'MISSING_UPDATE_ID' };
    }

    // 2. Replay Protection / Idempotency Check
    // We use BigInt(0) as the system/provider placeholder ID for webhook idempotency
    const idempotencyKey = `cryptobot_webhook_${updateId}`;
    let idempotencyRecord: any = null;
    try {
      const res = await this.idempotency.begin(BigInt(0), idempotencyKey, body);
      if (res.replay) {
        this.logger.log(`[CryptoBotWebhook] Duplicate request detected for update_id ${updateId}. Replaying previous response.`);
        return res.record.responsePayload || { status: 'OK', update_id: updateId, replayed: true };
      }
      idempotencyRecord = res.record;
    } catch (err: any) {
      this.logger.warn(`[CryptoBotWebhook] Idempotency check failed/in-progress: ${err?.message}`);
      return { status: 'IN_PROGRESS', update_id: updateId };
    }

    try {
      // 3. Process the event
      if (body?.update_type === 'invoice_paid' && body?.payload) {
        const invoicePayload = body.payload;
        const externalInvoiceId = invoicePayload.invoice_id?.toString();

        this.logger.log(`[CryptoBotWebhook] Confirmed invoice_paid for invoice_id: ${externalInvoiceId}`);

        // Query database PaymentInvoice record
        const dbInvoice = await this.reconciliationService['prisma'].paymentInvoice.findUnique({
          where: { externalInvoiceId },
        });

        if (dbInvoice) {
          await this.reconciliationService.fulfillPaidInvoice(dbInvoice.id, externalInvoiceId, invoicePayload);
        } else {
          const warningMsg = `No matching PaymentInvoice record for external invoice ID: ${externalInvoiceId}`;
          this.logger.warn(`[CryptoBotWebhook] ${warningMsg}`);
          
          // Queue warning to dead-letter queue (DLQ) operations queue for manual review
          await this.reconciliationService['prisma'].operationsQueueItem.create({
            data: {
              reason: 'WEBHOOK_UNMATCHED_INVOICE',
              status: OperationsQueueStatus.OPEN,
              payload: { body, warningMsg },
            },
          });
        }
      }

      // Mark idempotency check completed successfully
      const responsePayload = { status: 'OK', update_id: updateId };
      if (idempotencyRecord) {
        await this.idempotency.complete(idempotencyRecord.id, `webhook_${updateId}`, responsePayload);
      }
      return responsePayload;

    } catch (err: any) {
      this.logger.error(`[CryptoBotWebhook] Failed processing update_id ${updateId}: ${err?.message}`);

      // 4. Dead-Letter Queue (DLQ) / Failures Logging
      await this.reconciliationService['prisma'].operationsQueueItem.create({
        data: {
          reason: 'WEBHOOK_PROCESSING_FAILED',
          status: OperationsQueueStatus.OPEN,
          payload: {
            update_id: updateId,
            error: err?.message,
            stack: err?.stack,
            body,
          },
        },
      });

      // Mark idempotency check as failed so it can be retried by the provider
      if (idempotencyRecord) {
        await this.idempotency.fail(idempotencyRecord.id);
      }

      throw err;
    }
  }
}
