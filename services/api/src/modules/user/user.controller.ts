import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller()
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(['users/me', 'user/profile'])
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@TelegramUserId() telegramUserId: bigint) {
    return this.userService.getProfile(telegramUserId);
  }

  @Patch(['users/me', 'user/profile'])
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @TelegramUserId() telegramUserId: bigint,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateProfile(telegramUserId, dto);
  }

  @Get(['user/trust', 'user/trust-profile'])
  @ApiOperation({ summary: 'Get current user trust profile' })
  async getTrustProfile(@TelegramUserId() telegramUserId: bigint) {
    return this.userService.getTrustProfile(telegramUserId);
  }
}
