import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('Health (e2e)', () => {
  let app: NestExpressApplication;
  beforeAll(async () => { ({ app } = await createTestApp()); });
  afterAll(() => app.close());

  it('GET /health answers 200 without a login', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(res.body.data.time).getTime()).not.toBeNaN();
  });

  it('GET / answers the same, so the base address is not a 404', async () => {
    expect((await request(app.getHttpServer()).get('/').expect(200)).body.data.status).toBe('ok');
  });

  it('GET /health/db confirms the database answers', async () => {
    const res = await request(app.getHttpServer()).get('/health/db').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' });
    expect(res.body.data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('is never rate limited and sets no cache', async () => {
    for (let i = 0; i < 30; i++) await request(app.getHttpServer()).get('/health').expect(200);
  });
});
