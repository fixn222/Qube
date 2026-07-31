import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import slugify from 'slugify';
import { eq } from 'drizzle-orm';
import { COOKIE_KEYS } from '@qube/constants';
import { DrizzleService } from 'src/db/drizzle.service';
import { users, organizations, orgMembers } from 'src/db/schema';
import { RegisterDto } from './dto/register.dto';
import { LogInDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '@qube/types';
@Injectable()
export class AuthService {
  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  //Cookie helpers
  setTokenCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie(COOKIE_KEYS.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(COOKIE_KEYS.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearTokenCookies(res: Response) {
    res.clearCookie(COOKIE_KEYS.ACCESS_TOKEN);
    res.clearCookie(COOKIE_KEYS.REFRESH_TOKEN);
  }

  //slug helpers
  private generateOrgSlug(name: string): string {
    const base = slugify(`${name}-org`, { lower: true, strict: true });
    const suffix = randomBytes(3).toString('hex');

    return `${base}-${suffix}`;
  }

  //jwt signin
  private signTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  //Email + password
  async register(dto: RegisterDto) {
    const exsistUser = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (exsistUser.length > 0) {
      throw new ConflictException('Email already in use');
    }

    const passwordHashed = await bcrypt.hash(dto.password, 12);

    const [user] = await this.drizzle.db
      .insert(users)
      .values({
        email: dto.email,
        name: dto.name,
        passwordHash: passwordHashed,
      })
      .returning();

    const [org] = await this.drizzle.db
      .insert(organizations)
      .values({
        name: `${dto.name}'s Org`,
        slug: this.generateOrgSlug(dto.name),
      })
      .returning();

    await this.drizzle.db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.id,
      role: 'admin',
    });
    return this.signTokens(user.id, user.email);
  }

  async login(dto: LogInDto) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      users.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signTokens(user.id, user.email);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const [user] = await this.drizzle.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user) throw new UnauthorizedException();

      return this.signTokens(user.id, user.email);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  //OAuth helpers
  async handleOAuthUser(profile: {
    email: string;
    name: string;
    avatarUlr: string | null;
  }) {
    let [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);

    if (!user) {
      const [newUser] = await this.drizzle.db
        .insert(users)
        .values({
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUlr,
        })
        .returning();

      user = newUser;

      const [org] = await this.drizzle.db
        .insert(organizations)
        .values({
          name: `${profile.name}'s Org`,
          slug: this.generateOrgSlug(profile.name),
        })
        .returning();

      await this.drizzle.db.insert(orgMembers).values({
        orgId: org.id,
        userId: user.id,
        role: 'admin',
      });
    }

    return this.signTokens(user.id, user.email);
  }

  getGoogleAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID')!,
      redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL')!,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID')!,
        client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL')!,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    const profile = (await profileRes.json()) as {
      email: string;
      name: string;
      pic: string | null;
    };

    return this.handleOAuthUser({
      email: profile.email,
      name: profile.name,
      avatarUlr: profile.pic,
    });
  }

  getGithubAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.configService.get<string>('GITHUB_CLIENT_ID')!,
      redirect_uri: this.configService.get<string>('GITHUB_CALLBACK_URL')!,
      scope: 'read:user user:email',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleGithubCallback(code: string) {
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
          client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
          code,
          redirect_uri: this.configService.get<string>('GITHUB_CALLBACK_URL'),
        }),
      },
    );

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const profile = (await profileRes.json()) as {
      email: string | null;
      name: string | null;
      login: string;
      avatar_url: string | null;
    };

    let email = profile.email;

    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      const emails = (await emailRes.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];

      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    }
    return this.handleOAuthUser({
      email: email!,
      name: profile.name ?? profile.login,
      avatarUlr: profile.avatar_url ?? null,
    });
  }
}
