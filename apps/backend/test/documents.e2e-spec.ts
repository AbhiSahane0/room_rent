import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { LocalDiskStorage, R2Storage } from '../src/storage/storage.service';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, createUserAndLogin, MemoryStorage, resetDb } from './helpers';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 2)]);
const PDF = Buffer.from('%PDF-1.4\n%fake\n');

describe('Tenant documents (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let storage: MemoryStorage;
  let owner: Awaited<ReturnType<typeof createUserAndLogin>>;
  let other: Awaited<ReturnType<typeof createUserAndLogin>>;
  let tenantId: string;
  let docId: string;

  const upload = (client: typeof owner, id: string, file: Buffer, filename: string, type = 'AADHAAR', label?: string) => {
    const r = request(app.getHttpServer()).post(`/tenants/${id}/documents`).set('Authorization', `Bearer ${client.token}`).field('type', type);
    if (label) r.field('label', label);
    return r.attach('file', file, filename);
  };

  beforeAll(async () => {
    ({ app, prisma, storage } = await createTestApp());
    await resetDb(prisma);
    owner = await createUserAndLogin(app, prisma, 'owner');
    other = await createUserAndLogin(app, prisma, 'intruder');
    const propertyId = (await owner.post('/properties', { name: 'P', address: 'A', city: 'C', state: 'S', pincode: '411001' })).body.data.id;
    tenantId = (await owner.post('/tenants', { fullName: 'Rahul Sharma', phone: '9876543210', joiningDate: '2026-04-01', propertyId })).body.data.id;
  });
  afterAll(() => app.close());

  it('uploads an image to private storage and never exposes the storage key', async () => {
    const res = await upload(owner, tenantId, JPEG, 'aadhaar front.jpg', 'AADHAAR', 'Front').expect(201);
    docId = res.body.data.id;
    expect(res.body.data).toMatchObject({ type: 'AADHAAR', label: 'Front', mimeType: 'image/jpeg', sizeBytes: JPEG.length });
    expect(JSON.stringify(res.body)).not.toMatch(/storageKey|tenants\//);
    const [key] = [...storage.objects.keys()];
    expect(key).toMatch(new RegExp(`^tenants/${tenantId}/aadhaar/[0-9a-f-]{36}\\.jpg$`));
    expect(key).not.toMatch(/aadhaar front/); // client file name never reaches the key
  });

  it('accepts PNG and PDF, rejects everything else by content, not by extension', async () => {
    await upload(owner, tenantId, PNG, 'pan.png', 'PAN').expect(201);
    await upload(owner, tenantId, PDF, 'agreement.pdf', 'RENTAL_AGREEMENT').expect(201);
    const fake = await upload(owner, tenantId, Buffer.from('<script>alert(1)</script>'), 'evil.jpg', 'OTHER').expect(400);
    expect(fake.body.message).toBe('Only JPG, PNG, WebP images or PDF files are allowed');
    await upload(owner, tenantId, Buffer.alloc(0), 'empty.jpg').expect(400);
    await upload(owner, tenantId, JPEG, 'x.jpg', 'NOT_A_TYPE').expect(400);
  });

  it('rejects files over 10 MB', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(10 * 1024 * 1024 + 10, 3)]);
    const res = await upload(owner, tenantId, big, 'big.jpg').expect(413);
    expect(res.body.success).toBe(false);
  });

  it('lists documents without any links, and issues short-lived signed URLs on demand', async () => {
    const list = await owner.get(`/tenants/${tenantId}/documents`).expect(200);
    expect(list.body.data).toHaveLength(3);
    expect(JSON.stringify(list.body)).not.toMatch(/https?:\/\//);
    const res = await owner.get(`/documents/${docId}/url`).expect(200);
    expect(res.body.data.url).toContain('https://storage.test/tenants/');
    const ttl = new Date(res.body.data.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(200_000);
    expect(ttl).toBeLessThanOrEqual(300_000);
    expect(res.body.data.mimeType).toBe('image/jpeg');
  });

  it('keeps documents invisible to other users and unauthenticated callers', async () => {
    await other.get(`/tenants/${tenantId}/documents`).expect(404);
    await other.get(`/documents/${docId}/url`).expect(404);
    await other.delete(`/documents/${docId}`).expect(404);
    await upload(other, tenantId, JPEG, 'a.jpg').expect(404);
    await request(app.getHttpServer()).get(`/documents/${docId}/url`).expect(401);
    await request(app.getHttpServer()).get(`/tenants/${tenantId}/documents`).expect(401);
    await request(app.getHttpServer()).post(`/tenants/${tenantId}/documents`).attach('file', JPEG, 'a.jpg').expect(401);
  });

  it('audits views and uploads without recording signed URLs or file contents', async () => {
    const logs = await prisma.auditLog.findMany({ where: { entity: 'tenant_document' } });
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(['document.upload', 'document.view']));
    expect(JSON.stringify(logs)).not.toMatch(/https?:|signature|storage\.test/i);
  });

  it('deletes a document: record hidden, stored object removed, link no longer issued', async () => {
    const before = storage.objects.size;
    await owner.delete(`/documents/${docId}`).expect(200);
    expect(storage.objects.size).toBe(before - 1);
    await owner.get(`/documents/${docId}/url`).expect(404);
    expect((await owner.get(`/tenants/${tenantId}/documents`)).body.data).toHaveLength(2);
    expect((await prisma.tenantDocument.findUniqueOrThrow({ where: { id: docId } })).deletedAt).not.toBeNull();
  });

  it('tenant profile reports which document types are on file', async () => {
    const t = (await owner.get(`/tenants/${tenantId}`)).body.data;
    expect(t.documentTypes.sort()).toEqual(['PAN', 'RENTAL_AGREEMENT']);
  });

  it('rejects the dev-only local file route with a bad signature', async () => {
    await request(app.getHttpServer()).get('/files/local?key=tenants/x&exp=9999999999&name=a&sig=deadbeef').expect(404);
  });
});

describe('Storage providers', () => {
  const config = (values: Record<string, any>) => ({ get: (k: string) => values[k] }) as unknown as ConfigService<any, true>;

  it('R2 presigned URLs point at the private bucket and expire', async () => {
    const r2 = new R2Storage(config({ R2_ACCOUNT_ID: 'acct123', R2_ACCESS_KEY_ID: 'AKIATEST', R2_SECRET_ACCESS_KEY: 'secret', R2_BUCKET_NAME: 'rent-docs' }));
    const { url, expiresAt } = await r2.signedUrl('tenants/t/aadhaar/x.jpg', { ttlSeconds: 300, fileName: 'a.jpg', contentType: 'image/jpeg' });
    const u = new URL(url);
    expect(u.hostname).toContain('acct123.r2.cloudflarestorage.com');
    expect(u.pathname).toContain('rent-docs/tenants/t/aadhaar/x.jpg');
    expect(u.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url).not.toContain('secret');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('local dev links are tamper-proof and expire', async () => {
    const local = new LocalDiskStorage(config({ JWT_SECRET: 'test-access-secret-0123456789', PORT: 3000 }));
    await local.put('tenants/t/pan/a.png', PNG, 'image/png');
    const { url } = await local.signedUrl('tenants/t/pan/a.png', { ttlSeconds: 60, fileName: 'a.png', contentType: 'image/png' });
    const p = new URL(url).searchParams;
    const ok = await local.readSigned(p.get('key')!, Number(p.get('exp')), p.get('name')!, p.get('sig')!);
    expect(ok?.contentType).toBe('image/png');
    expect(await local.readSigned(p.get('key')!, Number(p.get('exp')) + 1, p.get('name')!, p.get('sig')!)).toBeNull();
    expect(await local.readSigned('tenants/t/pan/other.png', Number(p.get('exp')), p.get('name')!, p.get('sig')!)).toBeNull();
    expect(await local.readSigned('../../etc/passwd', Number(p.get('exp')), p.get('name')!, p.get('sig')!)).toBeNull();
    const past = Math.floor(Date.now() / 1000) - 5;
    expect(await local.readSigned('tenants/t/pan/a.png', past, 'a.png', 'x'.repeat(64))).toBeNull();
    await local.delete('tenants/t/pan/a.png');
  });
});
