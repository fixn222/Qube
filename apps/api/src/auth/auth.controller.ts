import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { COOKIE_KEYS } from '@qube/constants';
import type { JwtPayload } from '@qube/types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LogInDto } from './dto/login.dto';
import { InviteService } from 'src/members/invite.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private inviteService : InviteService ,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.authService.setTokenCookies(res, tokens);
    return { message: 'Registerd Successfully' };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LogInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.authService.setTokenCookies(res, tokens);
    return { message: 'Logged in Successfully' };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.clearTokenCookies(res);
    return { message: 'Logged out Successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[COOKIE_KEYS.REFRESH_TOKEN] as string;
    const tokens = await this.authService.refreshToken(refreshToken);
    this.authService.setTokenCookies(res, tokens);

    return { message: 'Tokens refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Get('google')
  @Redirect()
  googleLogin() {
    return { url: this.authService.getGoogleAuthUrl() };
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const tokens = await this.authService.handleGoogleCallback(code);
    this.authService.setTokenCookies(res, tokens);

    return res.redirect(`${this.configService.get('WEB_URL')}/dashboard`);
  }

  @Get('github')
  @Redirect()
  githubLogin() {
    return { url: this.authService.getGithubAuthUrl() };
  }

  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    const tokens = await this.authService.handleGithubCallback(code);
    this.authService.setTokenCookies(res, tokens);
    return res.redirect(`${this.configService.get('WEB_URL')}/dashboard`);
  }

  @Get('invite/accept')
  async acceptInvite(@Query('token') token : string , @Res() res : Response){
    await this.inviteService.acceptInvite(token)
    return res.redirect(`${this.configService.get('WEB_URL')}/dashboard`);
  }
}
