import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, createUserAndLogin, resetDb } from './helpers';

type Client = Awaited<ReturnType<typeof createUserAndLogin>>;

describe('Tenants, room assignment & move-out (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Client;
  let other: Client;
  let propertyId: string;
  const rooms: Record<string, string> = {};

  const tenantBody = (name: string, phone: string, extra: object = {}) => ({ fullName: name, phone, joiningDate: '2026-04-01', ...extra });
  const terms = (roomId: string, extra: object = {}) => ({ roomId, startDate: '2026-04-01', agreedRent: 8000, securityDeposit: 16000, ...extra });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDb(prisma);
    owner = await createUserAndLogin(app, prisma, 'owner');
    other = await createUserAndLogin(app, prisma, 'intruder');
    propertyId = (await owner.post('/properties', { name: 'Sunrise Residency', address: 'MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' })).body.data.id;
    for (const n of ['101', '102', '103']) {
      rooms[n] = (await owner.post('/rooms', { propertyId, roomNumber: n, defaultRent: 8000, electricityMode: 'METER', ratePerUnit: 8 })).body.data.id;
    }
  });
  afterAll(() => app.close());

  it('creates a tenant with a room assignment and marks the room occupied', async () => {
    const res = await owner.post('/tenants', tenantBody('Rahul Sharma', '98765 43210', { email: 'rahul@example.com', assignment: terms(rooms['101'], { initialMeterReading: 1200 }) })).expect(201);
    const t = res.body.data;
    expect(t).toMatchObject({ fullName: 'Rahul Sharma', phone: '9876543210', status: 'ACTIVE', outstanding: 0 });
    expect(t.currentAssignment).toMatchObject({ agreedRent: 8000, securityDeposit: 16000, initialMeterReading: 1200, electricityMode: 'METER', ratePerUnit: 8 });
    expect(t.currentAssignment.rents).toHaveLength(1);
    const room = (await owner.get(`/rooms/${rooms['101']}`)).body.data;
    expect(room).toMatchObject({ status: 'OCCUPIED', monthlyRent: 8000 });
    expect(room.currentTenant.fullName).toBe('Rahul Sharma');
  });

  it('validates tenant input', async () => {
    expect((await owner.post('/tenants', tenantBody('A', '123', { propertyId })).expect(400)).body.message).toBe('Enter a valid phone number (10 to 15 digits)');
    await owner.post('/tenants', { fullName: 'No Date', phone: '9876543211', propertyId }).expect(400);
    await owner.post('/tenants', tenantBody('No Property', '9876543211')).expect(400);
    await owner.post('/tenants', tenantBody('Bad Email', '9876543211', { propertyId, email: 'nope' })).expect(400);
  });

  it('refuses to assign an occupied room and does not leave a half-created tenant behind', async () => {
    const before = await prisma.tenant.count();
    const res = await owner.post('/tenants', tenantBody('Amit Kumar', '9000000001', { assignment: terms(rooms['101']) })).expect(409);
    expect(res.body.message).toBe('Room is already occupied');
    expect(await prisma.tenant.count()).toBe(before);
  });

  it('refuses maintenance rooms', async () => {
    await owner.put(`/rooms/${rooms['103']}`, { status: 'MAINTENANCE' }).expect(200);
    const res = await owner.post('/tenants', tenantBody('Amit Kumar', '9000000001', { assignment: terms(rooms['103']) })).expect(409);
    expect(res.body.message).toMatch(/maintenance/);
    await owner.put(`/rooms/${rooms['103']}`, { status: 'VACANT' }).expect(200);
  });

  it('lets only one of two concurrent requests take the same vacant room', async () => {
    const a = (await owner.post('/tenants', tenantBody('Racer One', '9000000011', { propertyId }))).body.data.id;
    const b = (await owner.post('/tenants', tenantBody('Racer Two', '9000000012', { propertyId }))).body.data.id;
    const [r1, r2] = await Promise.all([
      owner.post('/room-assignments', { tenantId: a, ...terms(rooms['102']) }),
      owner.post('/room-assignments', { tenantId: b, ...terms(rooms['102']) }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await prisma.roomAssignment.count({ where: { roomId: rooms['102'], status: 'ACTIVE' } })).toBe(1);
    // the database itself also rejects a second active assignment
    await expect(prisma.roomAssignment.create({ data: { tenantId: a === (r1.status === 201 ? a : b) ? b : a, roomId: rooms['102'], startDate: new Date(), agreedRent: 1, status: 'ACTIVE' } })).rejects.toBeTruthy();
    // free room 102 for later tests
    const winner = r1.status === 201 ? r1.body.data.id : r2.body.data.id;
    await owner.post(`/room-assignments/${winner}/move-out`, { moveOutDate: '2026-04-05' }).expect(200);
  });

  it('does not let a tenant hold two rooms', async () => {
    const rahul = (await prisma.tenant.findFirstOrThrow({ where: { fullName: 'Rahul Sharma' } })).id;
    const res = await owner.post('/room-assignments', { tenantId: rahul, ...terms(rooms['103']) }).expect(409);
    expect(res.body.message).toBe('This tenant already has an active room');
  });

  it('records rent changes over time without rewriting history', async () => {
    const rahul = (await owner.get('/tenants?search=rahul')).body.data.items[0];
    await owner.post(`/room-assignments/${rahul.assignmentId}/rent`, { amount: 8500, effectiveFrom: '2026-07-15' }).expect(200);
    const hist = (await owner.get(`/room-assignments/${rahul.assignmentId}/rent-history`)).body.data;
    expect(hist.map((h: any) => [h.effectiveFrom.slice(0, 10), h.amount])).toEqual([['2026-07-01', 8500], ['2026-04-01', 8000]]);
    expect((await owner.get(`/tenants/${rahul.id}`)).body.data.currentAssignment.agreedRent).toBe(8500);
    await owner.post(`/room-assignments/${rahul.assignmentId}/rent`, { amount: 9000, effectiveFrom: '2026-01-01' }).expect(400);
  });

  it('searches and paginates tenants by name, phone, email and room', async () => {
    const byName = (await owner.get('/tenants?search=sharma')).body.data;
    expect(byName.items).toHaveLength(1);
    expect(byName.items[0]).toMatchObject({ fullName: 'Rahul Sharma', room: { roomNumber: '101' }, monthlyRent: 8500, balance: 0 });
    expect((await owner.get('/tenants?search=98765')).body.data.total).toBe(1);
    expect((await owner.get('/tenants?search=rahul@example')).body.data.total).toBe(1);
    expect((await owner.get('/tenants?search=101')).body.data.total).toBe(1);
    const page = (await owner.get(`/tenants?propertyId=${propertyId}&pageSize=2&page=1`)).body.data;
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThanOrEqual(3);
    expect(page.items[0].status).toBe('ACTIVE');
  });

  it('hides everything from other users', async () => {
    const rahul = (await owner.get('/tenants?search=rahul')).body.data.items[0];
    await other.get(`/tenants/${rahul.id}`).expect(404);
    await other.put(`/tenants/${rahul.id}`, { notes: 'x' }).expect(404);
    await other.post(`/room-assignments/${rahul.assignmentId}/move-out`, { moveOutDate: '2026-08-01' }).expect(404);
    await other.post('/room-assignments', { tenantId: rahul.id, ...terms(rooms['103']) }).expect(404);
    expect((await other.get('/tenants')).body.data.total).toBe(0);
  });

  it('blocks deleting an active tenant', async () => {
    const rahul = (await owner.get('/tenants?search=rahul')).body.data.items[0];
    await owner.delete(`/tenants/${rahul.id}`).expect(409);
  });

  it('moves a tenant out: tenant MOVED_OUT, room VACANT, assignment CLOSED, history preserved', async () => {
    const rahul = (await owner.get('/tenants?search=rahul')).body.data.items[0];
    await owner.post(`/room-assignments/${rahul.assignmentId}/move-out`, { moveOutDate: '2026-03-01' }).expect(400); // before move-in
    await owner.post(`/room-assignments/${rahul.assignmentId}/move-out`, { moveOutDate: '2026-09-30', finalMeterReading: 1100 }).expect(400); // below initial reading
    const res = await owner.post(`/room-assignments/${rahul.assignmentId}/move-out`, { moveOutDate: '2026-09-30', finalMeterReading: 1350, notes: 'Left on good terms' }).expect(200);
    expect(res.body.data).toMatchObject({ status: 'CLOSED', finalBalance: 0 });

    expect((await owner.get(`/rooms/${rooms['101']}`)).body.data.status).toBe('VACANT');
    const t = (await owner.get(`/tenants/${rahul.id}`)).body.data;
    expect(t.status).toBe('MOVED_OUT');
    expect(t.currentAssignment).toBeNull();
    expect(t.roomHistory[0]).toMatchObject({ status: 'CLOSED', finalMeterReading: 1350, moveOutNotes: 'Left on good terms' });
    expect(t.roomHistory[0].endDate.slice(0, 10)).toBe('2026-09-30');
    const room = (await owner.get(`/rooms/${rooms['101']}`)).body.data;
    expect(room.previousTenants[0]).toMatchObject({ fullName: 'Rahul Sharma', agreedRent: 8500 });
    await owner.post(`/room-assignments/${rahul.assignmentId}/move-out`, { moveOutDate: '2026-10-01' }).expect(409);
  });

  it('allows the freed room to be re-let and keeps both tenants in history', async () => {
    const amit = (await owner.post('/tenants', tenantBody('Amit Kumar', '9000000001', { assignment: terms(rooms['101'], { agreedRent: 9000, startDate: '2026-10-01' }) })).expect(201)).body.data;
    const room = (await owner.get(`/rooms/${rooms['101']}`)).body.data;
    expect(room.currentTenant.fullName).toBe('Amit Kumar');
    expect(room.previousTenants.map((p: any) => p.fullName)).toEqual(['Rahul Sharma']);
    expect(amit.status).toBe('ACTIVE');
  });

  it('soft-deletes a moved-out tenant without losing the assignment history', async () => {
    const rahul = (await prisma.tenant.findFirstOrThrow({ where: { fullName: 'Rahul Sharma' } })).id;
    await owner.delete(`/tenants/${rahul}`).expect(200);
    await owner.get(`/tenants/${rahul}`).expect(404);
    expect((await owner.get('/tenants?search=rahul')).body.data.total).toBe(0);
    expect(await prisma.roomAssignment.count({ where: { tenantId: rahul } })).toBe(1);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: rahul } })).deletedAt).not.toBeNull();
  });

  it('keeps a room\'s status in step with its tenant at the database level', async () => {
    const room = (await owner.post('/rooms', { propertyId, roomNumber: 'SYNC-1', defaultRent: 3000, electricityMode: 'NONE' })).body.data;
    const t = (await owner.post('/tenants', { fullName: 'Sync Tenant', phone: '9000011111', joiningDate: '2026-04-01', assignment: { roomId: room.id, startDate: '2026-04-01', agreedRent: 3000 } })).body.data;
    expect((await prisma.room.findUniqueOrThrow({ where: { id: room.id } })).status).toBe('OCCUPIED');
    // A room with a tenant cannot be marked vacant or under maintenance behind the app's back.
    await expect(prisma.room.update({ where: { id: room.id }, data: { status: 'VACANT' } })).rejects.toThrow(/tenant living in it/);
    await expect(prisma.room.update({ where: { id: room.id }, data: { status: 'MAINTENANCE' } })).rejects.toThrow(/tenant living in it/);
    // Closing the stay by any route frees the room.
    await prisma.roomAssignment.update({ where: { id: t.currentAssignment.id }, data: { status: 'CLOSED', endDate: new Date('2026-05-31') } });
    expect((await prisma.room.findUniqueOrThrow({ where: { id: room.id } })).status).toBe('VACANT');
    // And a stay created behind the app's back occupies it.
    await prisma.roomAssignment.update({ where: { id: t.currentAssignment.id }, data: { status: 'ACTIVE', endDate: null } });
    expect((await prisma.room.findUniqueOrThrow({ where: { id: room.id } })).status).toBe('OCCUPIED');
  });
});
