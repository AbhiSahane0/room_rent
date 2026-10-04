import 'reflect-metadata';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.service';

export async function createTestApp() {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Wipes every table (TRUNCATE bypasses the append-only row triggers on purpose). */
export async function resetDb(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export async function createUserAndLogin(app: NestExpressApplication, prisma: PrismaService, username = 'owner', password = 'Secret123!') {
  const user = await prisma.user.create({ data: { username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  const res = await request(app.getHttpServer()).post('/auth/login').send({ username, password }).expect(200);
  const token: string = res.body.data.accessToken;
  const http = app.getHttpServer();
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  return {
    user,
    token,
    get: (url: string) => auth(request(http).get(url)),
    post: (url: string, body: object = {}) => auth(request(http).post(url)).send(body),
    put: (url: string, body: object = {}) => auth(request(http).put(url)).send(body),
    patch: (url: string, body: object = {}) => auth(request(http).patch(url)).send(body),
    delete: (url: string) => auth(request(http).delete(url)),
  };
}
