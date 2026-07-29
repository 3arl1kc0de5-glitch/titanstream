import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { CurrentAdmin, AuthenticatedAdmin } from '../decorators/current-admin.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminAuthService, AdminLoginDto } from '../services/admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  async logout(@Headers('authorization') authHeader: string, @Headers('x-admin-token') tokenHeader: string) {
    const raw = authHeader || tokenHeader || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    return this.authService.logout(token);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.authService.getMe(admin.id);
  }
}
