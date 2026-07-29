import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { MerchantPortalService } from '../services/merchant-portal.service';

@Controller('merchant')
@UseGuards(AdminAuthGuard)
export class MerchantPortalController {
  constructor(private readonly portalService: MerchantPortalService) {}

  @Get('assigned-settlements')
  async getAssignedSettlements(@CurrentAdmin() admin: AuthenticatedAdmin, @Headers('x-merchant-id') headerMerchantId?: string) {
    const merchantId = headerMerchantId || admin?.id || 'merch_default';
    return this.portalService.getAssignedSettlements(merchantId);
  }

  @Post('settlements/:id/fulfill')
  async fulfillSettlement(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: { proofReference?: string },
    @Headers('x-merchant-id') headerMerchantId?: string,
  ) {
    const merchantId = headerMerchantId || admin?.id || 'merch_default';
    return this.portalService.fulfillSettlement(merchantId, id, body.proofReference);
  }

  @Get('history')
  async getHistory(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Headers('x-merchant-id') headerMerchantId?: string,
  ) {
    const merchantId = headerMerchantId || admin?.id || 'merch_default';
    return this.portalService.getSettlementHistory(merchantId, limit, offset);
  }

  @Get('performance')
  async getPerformance(@CurrentAdmin() admin: AuthenticatedAdmin, @Headers('x-merchant-id') headerMerchantId?: string) {
    const merchantId = headerMerchantId || admin?.id || 'merch_default';
    return this.portalService.getMerchantPerformance(merchantId);
  }
}
