import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, createUserAndLogin, resetDb } from './helpers';

describe('Properties & Rooms (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof createUserAndLogin>>;
  let other: Awaited<ReturnType<typeof createUserAndLogin>>;
  let propertyId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDb(prisma);
    owner = await createUserAndLogin(app, prisma, 'owner');
    other = await createUserAndLogin(app, prisma, 'someone_else');
  });
  afterAll(() => app.close());

  it('creates and reads a property', async () => {
    const res = await owner
      .post('/properties', { name: 'Sunrise Residency', address: '12 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' })
      .expect(201);
    expect(res.body.message).toBe('Property created successfully');
    propertyId = res.body.data.id;
    const list = await owner.get('/properties').expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ name: 'Sunrise Residency', roomCount: 0 });
  });

  it('validates property input', async () => {
    const res = await owner.post('/properties', { name: 'X', address: 'a', city: 'c', state: 's', pincode: '12' }).expect(400);
    expect(res.body.message).toBe('Pincode must be 6 digits');
    await owner.post('/properties', { name: 'X', address: 'a', city: 'c', state: 's', pincode: '123456', hacker: true }).expect(400);
  });

  it('updates property details and bill settings', async () => {
    const res = await owner.put(`/properties/${propertyId}`, { description: 'Near the station', billPrefix: 'SUN', dueDayOfMonth: 5, defaultRatePerUnit: 9.5 }).expect(200);
    expect(res.body.data).toMatchObject({ billPrefix: 'SUN', dueDayOfMonth: 5, defaultRatePerUnit: 9.5 });
    await owner.put(`/properties/${propertyId}`, { dueDayOfMonth: 40 }).expect(400);
  });

  it('hides properties and rooms from other users', async () => {
    await other.get(`/properties/${propertyId}`).expect(404);
    await other.put(`/properties/${propertyId}`, { name: 'Hijack' }).expect(404);
    await other.post('/rooms', { propertyId, roomNumber: '999', defaultRent: 1000 }).expect(404);
    expect((await other.get('/properties').expect(200)).body.data).toHaveLength(0);
  });

  it('adds five rooms and rejects duplicates', async () => {
    for (const n of ['101', '102', '103', '104', '105']) {
      await owner.post('/rooms', { propertyId, roomNumber: n, defaultRent: 8000, electricityMode: 'METER', ratePerUnit: 8 }).expect(201);
    }
    const dup = await owner.post('/rooms', { propertyId, roomNumber: '101', defaultRent: 8000 }).expect(409);
    expect(dup.body.message).toBe('Room 101 already exists in this property');
    await owner.post('/rooms', { propertyId, roomNumber: '106', defaultRent: -5 }).expect(400);
  });

  it('lists rooms with pagination, filters and search', async () => {
    const page1 = await owner.get(`/rooms?propertyId=${propertyId}&page=1&pageSize=2`).expect(200);
    expect(page1.body.data).toMatchObject({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
    expect(page1.body.data.items.map((r: any) => r.roomNumber)).toEqual(['101', '102']);
    expect(page1.body.data.items[0]).toMatchObject({ status: 'VACANT', currentTenant: null, balance: 0, monthlyRent: 8000 });

    const search = await owner.get(`/rooms?propertyId=${propertyId}&search=103`).expect(200);
    expect(search.body.data.items).toHaveLength(1);
    const status = await owner.get(`/rooms?propertyId=${propertyId}&search=vac`).expect(200);
    expect(status.body.data.total).toBe(5);
    await owner.get(`/rooms?pageSize=500`).expect(400);
  });

  it('changes status between VACANT and MAINTENANCE only', async () => {
    const rooms = (await owner.get(`/rooms?propertyId=${propertyId}`).expect(200)).body.data.items;
    const id = rooms[4].id;
    await owner.put(`/rooms/${id}`, { status: 'MAINTENANCE' }).expect(200);
    expect((await owner.get(`/rooms?propertyId=${propertyId}&status=MAINTENANCE`)).body.data.total).toBe(1);
    await owner.put(`/rooms/${id}`, { status: 'OCCUPIED' }).expect(400);
    await owner.put(`/rooms/${id}`, { status: 'VACANT', defaultRent: 8500 }).expect(200);
    const detail = await owner.get(`/rooms/${id}`).expect(200);
    expect(detail.body.data).toMatchObject({ roomNumber: '105', monthlyRent: 8500, previousTenants: [], currentTenant: null, property: { name: 'Sunrise Residency' } });
  });

  it('refuses to rename a room onto an existing number', async () => {
    const rooms = (await owner.get(`/rooms?propertyId=${propertyId}`).expect(200)).body.data.items;
    await owner.put(`/rooms/${rooms[1].id}`, { roomNumber: '101' }).expect(409);
  });
});
