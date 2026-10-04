import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { Env } from '../common/env';
import { LoginDto, UpdateCredentialsDto } from './auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until the access token expires
}

interface RefreshPayload {
  sub: string;
  sid: string;
  jti: string;
}

const GRACE_MS = 30_000;
const INVALID = 'Your session has expired. Please log in again.';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const safeEqual = (a: string, b: string) => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

@Injectable()
export class AuthService {
  private dummyHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {
    // Used to equalise timing when the username does not exist.
    this.dummyHash = argon2.hash('not-a-real-password', { type: argon2.argon2id });
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: dto.username.trim(), mode: 'insensitive' } },
    });
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const ok = await argon2.verify(hash, dto.password).catch(() => false);
    if (!user || !ok || !user.isActive) {
      await this.audit.log(user?.id ?? null, 'auth.login_failed', 'user', user?.id);
      throw new UnauthorizedException('Invalid username or password');
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: 'pending',
        userAgent: userAgent?.slice(0, 200),
        expiresAt: this.refreshExpiry(),
      },
    });
    const tokens = await this.issueTokens(user.id, user.username, session.id);
    await this.audit.log(user.id, 'auth.login', 'session', session.id);
    return { ...tokens, user: { id: user.id, username: user.username } };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshJwt(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
      throw new UnauthorizedException(INVALID);
    }

    const presented = sha256(payload.jti);
    const isCurrent = safeEqual(presented, session.tokenHash);
    const isRecentPrevious =
      !!session.prevTokenHash &&
      !!session.rotatedAt &&
      Date.now() - session.rotatedAt.getTime() < GRACE_MS &&
      safeEqual(presented, session.prevTokenHash);

    if (!isCurrent && !isRecentPrevious) {
      // A rotated-out refresh token was replayed: assume theft and kill the session.
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      await this.audit.log(session.userId, 'auth.refresh_reuse_detected', 'session', session.id);
      throw new UnauthorizedException(INVALID);
    }

    const tokens = await this.issueTokens(session.userId, session.user.username, session.id, isCurrent ? session.tokenHash : undefined);
    return { ...tokens, user: { id: session.userId, username: session.user.username } };
  }

  async logout(refreshToken?: string, sessionId?: string) {
    let sid = sessionId;
    if (!sid && refreshToken) {
      sid = (await this.verifyRefreshJwt(refreshToken).catch(() => null))?.sid;
    }
    if (!sid) return;
    const res = await this.prisma.session.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } });
    if (res.count) await this.audit.log(null, 'auth.logout', 'session', sid);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { id: user.id, username: user.username };
  }

  async updateCredentials(userId: string, sessionId: string, dto: UpdateCredentialsDto) {
    if (!dto.username && !dto.newPassword) throw new BadRequestException('Nothing to update');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword).catch(() => false))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.username && dto.username.toLowerCase() !== user.username.toLowerCase()) {
      const taken = await this.prisma.user.findFirst({
        where: { username: { equals: dto.username, mode: 'insensitive' }, NOT: { id: userId } },
      });
      if (taken) throw new ConflictException('That username is already taken');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username ? { username: dto.username } : {}),
        ...(dto.newPassword ? { passwordHash: await argon2.hash(dto.newPassword, { type: argon2.argon2id }) } : {}),
      },
    });
    if (dto.newPassword) {
      // Password change signs out every other device.
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null, NOT: { id: sessionId } },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.log(userId, 'auth.credentials_updated', 'user', userId, {
      usernameChanged: !!dto.username,
      passwordChanged: !!dto.newPassword,
    });
    return { id: updated.id, username: updated.username };
  }

  /** Verifies an access token and that its session/user are still valid. */
  async authenticate(token: string) {
    let payload: { sub: string; sid: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_SECRET', { infer: true }), algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    const session = await this.prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive || session.userId !== payload.sub) {
      throw new UnauthorizedException('Unauthorized');
    }
    return { userId: session.userId, sessionId: session.id, username: session.user.username };
  }

  private refreshExpiry() {
    return new Date(Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000);
  }

  private async verifyRefreshJwt(token: string): Promise<RefreshPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException(INVALID);
    }
  }

  private async issueTokens(userId: string, username: string, sessionId: string, previousHash?: string): Promise<TokenPair> {
    const jti = randomBytes(32).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const accessTtl = this.config.get('ACCESS_TOKEN_TTL', { infer: true });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ sub: userId, sid: sessionId, username }, { secret: this.config.get('JWT_SECRET', { infer: true }), expiresIn: accessTtl as any, algorithm: 'HS256' }),
      this.jwt.signAsync({ sub: userId, sid: sessionId, jti }, { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }), expiresIn: `${ttlDays}d` as any, algorithm: 'HS256' }),
    ]);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        tokenHash: sha256(jti),
        prevTokenHash: previousHash ?? null,
        rotatedAt: previousHash ? new Date() : null,
        lastUsedAt: new Date(),
        expiresAt: this.refreshExpiry(), // sliding window: active users never expire
      },
    });
    const decoded = this.jwt.decode(accessToken) as { exp: number; iat: number };
    return { accessToken, refreshToken, expiresIn: decoded.exp - decoded.iat };
  }
}
