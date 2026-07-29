import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentOrderService, CreatePaymentOrderDto } from './payment-order.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../admin/decorators/current-admin.decorator';

@ApiTags('Payment Orders')
@Controller('payment-orders')
export class PaymentOrderController {
  constructor(private readonly service: PaymentOrderService) {}

  @Get('destinations')
  @ApiOperation({ summary: 'Get active Mobile Money receiving destinations & USSD templates' })
  getDestinations() {
    return {
      success: true,
      data: this.service.getDestinationConfigs(),
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new Payment Order (Deposit, Withdrawal, Machine Purchase)' })
  async createOrder(
    @TelegramUserId() telegramUserId: bigint,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    const order = await this.service.createOrder(telegramUserId, dto);
    return {
      success: true,
      data: order,
    };
  }

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user payment orders' })
  getMyOrders(@TelegramUserId() telegramUserId: bigint) {
    return {
      success: true,
      data: this.service.getUserOrders(telegramUserId.toString()),
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get payment order details by ID' })
  getOrder(@Param('id') id: string) {
    return {
      success: true,
      data: this.service.getOrder(id),
    };
  }

  @Post(':id/verify')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Submit payment order for operator verification after USSD completion' })
  async submitForVerification(@Param('id') id: string) {
    const order = await this.service.submitForVerification(id);
    return {
      success: true,
      data: order,
    };
  }

  // ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

  @Get('admin/list')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Admin list all payment orders across all users' })
  adminListOrders() {
    return {
      success: true,
      data: this.service.getAllOrders(),
    };
  }

  @Post('admin/:id/approve')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Admin approve payment order and execute double-entry ledger posting' })
  async adminApproveOrder(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
  ) {
    const order = await this.service.approveOrder(id, admin.id);
    return {
      success: true,
      data: order,
    };
  }

  @Post('admin/:id/reject')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Admin reject payment order with reason' })
  async adminRejectOrder(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const order = await this.service.rejectOrder(id, reason || 'Operator rejected', admin.id);
    return {
      success: true,
      data: order,
    };
  }

  @Post('admin/destinations/:id')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Admin update receiving destination configuration or USSD template' })
  adminUpdateDestination(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const cfg = this.service.updateDestinationConfig(id, body);
    return {
      success: true,
      data: cfg,
    };
  }
}
