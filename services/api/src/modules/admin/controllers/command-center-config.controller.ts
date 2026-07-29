import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { AdminPermission } from '../interfaces/admin-permissions.enum';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { CommandCenterConfigService } from '../services/command-center-config.service';

@ApiTags('Admin Command Center Settings & Registries')
@Controller('admin/config')
@UseGuards(AdminAuthGuard, RbacGuard)
export class CommandCenterConfigController {
  constructor(private readonly service: CommandCenterConfigService) {}

  @Get('mobile-money')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get Mobile Money Receiving Numbers Registry' })
  getMobileMoneyRegistry() {
    return {
      success: true,
      data: this.service.getMobileMoneyRegistry(),
    };
  }

  @Post('mobile-money')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Create or Edit Mobile Money Receiving Number and USSD template' })
  upsertMobileMoney(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() body: any,
  ) {
    const cfg = this.service.upsertMobileMoneyConfig(body, admin.id);
    return {
      success: true,
      data: cfg,
    };
  }

  @Get('crypto-wallets')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get Crypto Receiving Wallets Registry' })
  getCryptoWallets() {
    return {
      success: true,
      data: this.service.getCryptoWalletRegistry(),
    };
  }

  @Post('crypto-wallets')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Create or Edit Crypto Receiving Wallet' })
  upsertCryptoWallet(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() body: any,
  ) {
    const wallet = this.service.upsertCryptoWalletConfig(body, admin.id);
    return {
      success: true,
      data: wallet,
    };
  }

  @Post('ussd/preview')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Test and preview USSD string and tel: protocol launcher' })
  testUssdTemplate(
    @Body('template') template: string,
    @Body('phone') phone: string,
    @Body('amount') amount: number,
  ) {
    const preview = this.service.testUssdTemplate(
      template || '*165*1*1*{phone}*{amount}#',
      phone || '0771234567',
      amount || 50000,
    );
    return {
      success: true,
      data: preview,
    };
  }

  @Get('settings')
  @Permissions(AdminPermission.SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get Command Center System Settings (Machine catalog, limits, policies)' })
  getSettings() {
    return {
      success: true,
      data: this.service.getSettings(),
    };
  }

  @Post('settings')
  @Permissions(AdminPermission.SETTLEMENT_OVERRIDE)
  @ApiOperation({ summary: 'Update Command Center System Settings' })
  updateSettings(@Body() body: any) {
    const updated = this.service.updateSettings(body);
    return {
      success: true,
      data: updated,
    };
  }
}
