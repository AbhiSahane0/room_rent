import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, createUserAndLogin, resetDb } from './helpers';

type Client = Awaited<ReturnType<typeof createUserAndLogin>>;

describe('Read cache (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Client;
  let other: Client;
  let propertyId: string;
  let roomId: string;
  let assignmentId: string;
  const rooms = async (c: Client) => ((await c.get(`/rooms?propertyId=${propertyId}`)).body.data.items as { id: string; notes: string | null }[]);

  beforeAll(async () => {
    process.env.READ_CACHE_MS = '60000'; // the cache is off in tests unless asked for
    ({ app, prisma } = await createTestApp());
    await resetDb(prisma);
    owner = await createUserAndLogin(app, prisma, 'owner');
    other = await createUserAndLogin(app, prisma, 'intruder');
    propertyId = (await owner.post('/properties', { name: 'Sunrise', address: 'MG Road', city: 'Pune', state: 'MH', pincode: '411001' })).body.data.id;
    roomId = (await owner.post('/rooms', { propertyId, roomNumber: '101', defaultRent: 5000, electricityMode: 'NONE' })).body.data.id;
    const t = (await owner.post('/tenants', { fullName: 'Asha', phone: '9876543210', joiningDate: '2026-04-01', assignment: { roomId, startDate: '2026-04-01', agreedRent: 5000 } })).body.data;
    assignmentId = t.currentAssignment.id;
  });
  afterAll(async () => { delete process.env.READ_CACHE_MS; await app.close(); });

  it('answers a repeated GET from memory, never past the owner\'s own writes', async () => {
    expect((await rooms(owner))[0].notes).toBeNull();
    await prisma.room.update({ where: { id: roomId }, data: { notes: 'changed behind the API' } });
    expect((await rooms(owner))[0].notes).toBeNull(); // served from the cache
    await owner.put(`/rooms/${roomId}`, { floor: '1st' }).expect(200); // a write by the owner drops their cached answers
    expect((await rooms(owner))[0].notes).toBe('changed behind the API');
  });

  it('keeps owners apart and never lets another owner see cached data', async () => {
    await rooms(owner);
    await other.get(`/rooms?propertyId=${propertyId}`).expect(404);
    const mine = (await other.get('/rooms')).body.data.items;
    expect(mine).toEqual([]);
  });

  it('does not treat a bill preview as a write', async () => {
    expect((await rooms(owner))[0].notes).toBe('changed behind the API');
    await prisma.room.update({ where: { id: roomId }, data: { notes: 'second change' } });
    await owner.post('/bills/preview', { assignmentId, billingPeriod: '2026-09' }).expect(200);
    expect((await rooms(owner))[0].notes).toBe('changed behind the API'); // still cached: preview changed nothing
    await owner.post('/bills', { assignmentId, billingPeriod: '2026-09' }).expect(201); // a real write
    expect((await rooms(owner))[0].notes).toBe('second change');
  });

  it('never caches files or document links', async () => {
    const billId = (await owner.get(`/bills?propertyId=${propertyId}`)).body.data.items[0].id;
    const a = await owner.get(`/bills/${billId}/pdf`).expect(200);
    const b = await owner.get(`/bills/${billId}/pdf`).expect(200);
    expect(a.headers['content-type']).toBe('application/pdf');
    expect(b.headers['content-type']).toBe('application/pdf');
    const audits = await prisma.auditLog.count({ where: { action: 'bill.pdf' } });
    expect(audits).toBe(2);
  });
});
