import { NestExpressApplication } from '@nestjs/platform-express';
import * as argon2 from 'argon2';
import pdfParse from 'pdf-parse';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, MemoryStorage, resetDb } from './helpers';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 7)]);

/**
 * The "FINAL ACCEPTANCE TEST" scenario from the brief, driven through the real HTTP API
 * (steps 1-5 are the mobile app's persistent login, covered by the auth tests and the browser run).
 */
describe('Final acceptance scenario (API)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let storage: MemoryStorage;
  let token: string;
  let refreshToken: string;
  let propertyId: string;
  const rooms: Record<string, string> = {};
  let tenantId: string;
  let assignmentId: string;
  let billId: string;

  const api = (method: 'get' | 'post' | 'put' | 'delete', url: string, body?: object) => {
    const r = request(app.getHttpServer())[method](url).set('Authorization', `Bearer ${token}`);
    return body ? r.send(body) : r;
  };

  beforeAll(async () => {
    ({ app, prisma, storage } = await createTestApp());
    await resetDb(prisma);
    await prisma.user.create({ data: { username: 'owner', passwordHash: await argon2.hash('Secret123!', { type: argon2.argon2id }) } });
  });
  afterAll(() => app.close());

  it('2-5. logs in with username/password and stays signed in through a token refresh', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ username: 'owner', password: 'Secret123!' }).expect(200);
    refreshToken = login.body.data.refreshToken;
    // "close and reopen the app": the stored refresh token alone restores access
    const reopened = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(200);
    token = reopened.body.data.accessToken;
    expect((await api('get', '/auth/me').expect(200)).body.data.username).toBe('owner');
  });

  it('6-7. creates a property and 5 rooms', async () => {
    propertyId = (await api('post', '/properties', { name: 'Sunrise Residency', address: '12 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' }).expect(201)).body.data.id;
    for (const n of ['101', '102', '103', '104', '105']) {
      rooms[n] = (await api('post', '/rooms', { propertyId, roomNumber: n, defaultRent: 8000, electricityMode: 'METER', ratePerUnit: 8 }).expect(201)).body.data.id;
    }
    expect((await api('get', `/rooms?propertyId=${propertyId}`)).body.data.total).toBe(5);
  });

  it('8-11. adds a tenant and uploads Aadhaar and PAN to private storage', async () => {
    tenantId = (await api('post', '/tenants', { fullName: 'Rahul Sharma', phone: '9876543210', joiningDate: '2026-04-01', propertyId }).expect(201)).body.data.id;
    for (const type of ['AADHAAR', 'PAN']) {
      await request(app.getHttpServer()).post(`/tenants/${tenantId}/documents`).set('Authorization', `Bearer ${token}`).field('type', type).attach('file', JPEG, `${type}.jpg`).expect(201);
    }
    expect(storage.objects.size).toBe(2);
    const docs = (await api('get', `/tenants/${tenantId}/documents`)).body.data;
    expect(docs.map((d: any) => d.type).sort()).toEqual(['AADHAAR', 'PAN']);
    const link = (await api('get', `/documents/${docs[0].id}/url`).expect(200)).body.data;
    expect(new Date(link.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('12-13. assigns the tenant to a vacant room with a monthly rent', async () => {
    const res = await api('post', '/room-assignments', { tenantId, roomId: rooms['101'], startDate: '2026-04-01', agreedRent: 8000, securityDeposit: 16000, initialMeterReading: 1200 }).expect(201);
    assignmentId = res.body.data.id;
    expect((await api('get', `/rooms/${rooms['101']}`)).body.data).toMatchObject({ status: 'OCCUPIED', monthlyRent: 8000 });
    await api('post', '/room-assignments', { tenantId, roomId: rooms['102'], startDate: '2026-04-01', agreedRent: 8000 }).expect(409);
  });

  it('14-17. generates the September bill with electricity and maintenance', async () => {
    const res = await api('post', '/bills', { assignmentId, billingPeriod: '2026-09', electricity: { currentReading: 1350 }, charges: [{ type: 'MAINTENANCE', amount: 500 }, { type: 'WATER', amount: 200 }] }).expect(201);
    billId = res.body.data.id;
    expect(res.body.data).toMatchObject({ rentAmount: 8000, electricityAmount: 1200, otherChargesAmount: 700, totalDue: 9900, paidAmount: 0, balance: 9900 });
  });

  it('18-19. produces the PDF that is shared from the phone', async () => {
    const res = await request(app.getHttpServer()).get(`/bills/${billId}/pdf`).set('Authorization', `Bearer ${token}`).buffer(true).parse((r, cb) => {
      const c: Buffer[] = [];
      r.on('data', (d: Buffer) => c.push(d));
      r.on('end', () => cb(null, Buffer.concat(c)));
    }).expect(200);
    const text = (await pdfParse(res.body)).text;
    expect(text).toContain('Rahul Sharma');
    expect(text).toContain('Monthly Payment');
    expect(text.replace(/\s+/g, '')).toContain('9900');
  });

  it('20-21. records a ₹5,000 payment and shows the remaining balance', async () => {
    const res = await api('post', `/bills/${billId}/payments`, { amount: 5000, paymentDate: '2026-09-10', method: 'UPI', reference: 'UPI-1' }).expect(201);
    expect(res.body.data.bill).toMatchObject({ paidAmount: 5000, balance: 4900, totalDue: 9900, storedStatus: 'PARTIALLY_PAID' });
  });

  it('22-24. shows the tenant profile, bill history and payment history', async () => {
    const profile = (await api('get', `/tenants/${tenantId}`)).body.data;
    expect(profile).toMatchObject({ fullName: 'Rahul Sharma', outstanding: 4900, status: 'ACTIVE' });
    expect(profile.currentAssignment).toMatchObject({ agreedRent: 8000, securityDeposit: 16000 });
    const bills = (await api('get', `/bills?tenantId=${tenantId}`)).body.data.items;
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ totalDue: 9900, paidAmount: 5000, balance: 4900 });
    const payments = (await api('get', `/payments?tenantId=${tenantId}`)).body.data;
    expect(payments.items).toHaveLength(1);
    expect(payments.summary.totalAmount).toBe(5000);
  });

  it('25-28. moves the tenant out; the room is vacant, history stays and old bills are unchanged', async () => {
    const before = (await api('get', `/bills/${billId}`)).body.data;
    const out = await api('post', `/room-assignments/${assignmentId}/move-out`, { moveOutDate: '2026-09-30', finalMeterReading: 1350, notes: 'Left on good terms' }).expect(200);
    expect(out.body.data).toMatchObject({ status: 'CLOSED', finalBalance: 4900 });

    expect((await api('get', `/rooms/${rooms['101']}`)).body.data).toMatchObject({ status: 'VACANT', currentTenant: null });
    const tenant = (await api('get', `/tenants/${tenantId}`)).body.data;
    expect(tenant.status).toBe('MOVED_OUT');
    expect(tenant.roomHistory).toHaveLength(1);
    expect(tenant.outstanding).toBe(4900); // the debt is not forgotten

    const room = (await api('get', `/rooms/${rooms['101']}`)).body.data;
    expect(room.previousTenants[0]).toMatchObject({ fullName: 'Rahul Sharma' });

    const after = (await api('get', `/bills/${billId}`)).body.data;
    for (const k of ['totalDue', 'rentAmount', 'electricityAmount', 'otherChargesAmount', 'billNumber', 'dueDate', 'billingPeriod']) expect(after[k]).toEqual(before[k]);
    expect(after.items).toEqual(before.items);
    expect(after.payments).toHaveLength(1);
    expect((await api('get', `/tenants/${tenantId}/documents`)).body.data).toHaveLength(2); // documents survive move-out
  });

  it('logout revokes the session', async () => {
    await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken }).expect(200);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
  });
});
