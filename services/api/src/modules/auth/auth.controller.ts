import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthTelegramDto } from './dto/auth-telegram.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';

import { WebAuthSessionService } from './web-auth-session.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly webAuthSessionService: WebAuthSessionService,
  ) {}

  @Public()
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Telegram initData' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid initData' })
  async authenticate(@Body() dto: AuthTelegramDto, @Req() req: any) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.authenticate(dto.initData, ipAddress, userAgent);
  }

  @Public()
  @Post('web-session/create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Web Auth Deep Link session' })
  async createWebSession() {
    return { success: true, data: this.webAuthSessionService.createWebAuthSession() };
  }

  @Public()
  @Post('web-session/poll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Poll status of Web Auth Deep Link session' })
  async pollWebSession(@Body('sessionCode') sessionCode: string) {
    return { success: true, data: this.webAuthSessionService.pollWebAuthSession(sessionCode) };
  }

  @Public()
  @Post('telegram-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Telegram Web Login Widget' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid Telegram Web Login payload' })
  async authenticateWebLogin(@Body() payload: any, @Req() req: any) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.authenticateWebLogin(payload, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@TelegramUserId() telegramUserId: bigint) {
    return this.authService.getProfile(telegramUserId);
  }
}