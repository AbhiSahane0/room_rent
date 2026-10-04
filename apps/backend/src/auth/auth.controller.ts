import { Body, Controller, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthUser, CurrentUser, Public, ResponseMessage } from '../common/decorators';
import { LoginDto, LogoutDto, RefreshDto, UpdateCredentialsDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Logged in successfully')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Public so a user whose access token already expired can still revoke the session. */
  @Public()
  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Logged out')
  async logout(@Body() dto: LogoutDto) {
    await this.auth.logout(dto.refreshToken);
    return null;
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Patch('credentials')
  @ResponseMessage('Credentials updated')
  updateCredentials(@CurrentUser() user: AuthUser, @Body() dto: UpdateCredentialsDto) {
    return this.auth.updateCredentials(user.userId, user.sessionId, dto);
  }
}
