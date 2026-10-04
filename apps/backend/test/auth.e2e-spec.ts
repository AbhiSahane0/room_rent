import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.service';

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const username = 'e2e_owner';
  const password = 'Secret123!';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.session.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany({ where: { username } });
    await prisma.user.create({ data: { username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (u = username, p = password) => request(app.getHttpServer()).post('/auth/login').send({ username: u, password: p });
  const refresh = (refreshToken: string) => request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });

  it('logs in with valid credentials and returns the standard envelope', async () => {
    const res = await login().expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.username).toBe(username);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('is case-insensitive on username but rejects wrong passwords generically', async () => {
    await login('E2E_OWNER').expect(200);
    const bad = await login(username, 'wrong-pass').expect(401);
    const unknown = await login('nobody', 'wrong-pass').expect(401);
    expect(bad.body).toEqual({ success: false, message: 'Invalid username or password' });
    expect(unknown.body).toEqual(bad.body);
  });

  it('rejects requests without or with a bad access token', async () => {
    await request(app.getHttpServer()).get('/dashboard').expect(401);
    await request(app.getHttpServer()).get('/dashboard').set('Authorization', 'Bearer nope').expect(401);
  });

  it('allows access with a valid access token', async () => {
    const { body } = await login();
    const res = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`).expect(200);
    expect(res.body.data.username).toBe(username);
  });

  it('rotates refresh tokens and returns working new tokens', async () => {
    const { body } = await login();
    const r1 = await refresh(body.data.refreshToken).expect(200);
    expect(r1.body.data.refreshToken).not.toBe(body.data.refreshToken);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${r1.body.data.accessToken}`).expect(200);
    const r2 = await refresh(r1.body.data.refreshToken).expect(200);
    expect(r2.body.data.refreshToken).toBeTruthy();
  });

  it('tolerates a retried refresh inside the grace window', async () => {
    const { body } = await login();
    await refresh(body.data.refreshToken).expect(200);
    await refresh(body.data.refreshToken).expect(200); // lost-response retry
  });

  it('revokes the session when a rotated-out refresh token is replayed after the grace window', async () => {
    const { body } = await login();
    const r1 = await refresh(body.data.refreshToken).expect(200);
    const sid = JSON.parse(Buffer.from(body.data.refreshToken.split('.')[1], 'base64url').toString()).sid;
    await prisma.session.update({ where: { id: sid }, data: { rotatedAt: new Date(Date.now() - 120_000) } });
    await refresh(body.data.refreshToken).expect(401);
    // the thief's session is dead, including the legitimate newest token
    await refresh(r1.body.data.refreshToken).expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${r1.body.data.accessToken}`).expect(401);
  });

  it('rejects garbage refresh tokens', async () => {
    await refresh('not.a.jwt').expect(401);
  });

  it('logout revokes the session even with no access token', async () => {
    const { body } = await login();
    await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: body.data.refreshToken }).expect(200);
    await refresh(body.data.refreshToken).expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`).expect(401);
  });

  it('stops working once the account is disabled', async () => {
    const { body } = await login();
    await prisma.user.update({ where: { username }, data: { isActive: false } });
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`).expect(401);
    await refresh(body.data.refreshToken).expect(401);
    await login().expect(401);
    await prisma.user.update({ where: { username }, data: { isActive: true } });
  });

  it('changes the password, signs out other sessions and requires the current password', async () => {
    const a = await login();
    const b = await login();
    const auth = { Authorization: `Bearer ${a.body.data.accessToken}` };
    await request(app.getHttpServer()).patch('/auth/credentials').set(auth).send({ currentPassword: 'bad', newPassword: 'Another123!' }).expect(400);
    await request(app.getHttpServer()).patch('/auth/credentials').set(auth).send({ currentPassword: password, newPassword: 'short' }).expect(400);
    await request(app.getHttpServer()).patch('/auth/credentials').set(auth).send({ currentPassword: password, newPassword: 'Another123!' }).expect(200);
    await request(app.getHttpServer()).get('/auth/me').set(auth).expect(200);
    await refresh(b.body.data.refreshToken).expect(401);
    await login(username, password).expect(401);
    await login(username, 'Another123!').expect(200);
    // restore for any later test
    const c = await login(username, 'Another123!');
    await request(app.getHttpServer()).patch('/auth/credentials').set({ Authorization: `Bearer ${c.body.data.accessToken}` }).send({ currentPassword: 'Another123!', newPassword: password }).expect(200);
  });

  it('returns validation errors in the standard failure shape', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ username: '' }).expect(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe('string');
  });
});
