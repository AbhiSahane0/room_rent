import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, createUserAndLogin, resetDb } from './helpers';

type Client = Awaited<ReturnType<typeof createUserAndLogin>>;

describe('Payments (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Client;
  let other: Client;
  let propertyId: string;
  let roomId: string;
  let tenantId: string;
  let assignmentId: string;
  let tenantB: string;
  let julBillId: string;
  let billId: string; // September: 8000 + 1200 + 800 = 10,000

  const pay = (id: string, amount: number, extra: object = {}) => owner.post(`/bills/${id}/payments`, { amount, paymentDate: '2026-09-10', method: 'UPI', ...extra });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDb(prisma);
    owner = await createUserAndLogin(app, prisma, 'owner');
    other = await createUserAndLogin(app, prisma, 'intruder');
    propertyId = (await owner.post('/properties', { name: 'Sunrise Residency', address: 'MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' })).body.data.id;
    roomId = (await owner.post('/rooms', { propertyId, roomNumber: '101', defaultRent: 8000, electricityMode: 'METER', ratePerUnit: 8 })).body.data.id;
    const t = (await owner.post('/tenants', { fullName: 'Rahul Sharma', phone: '9876543210', joiningDate: '2026-04-01', assignment: { roomId, startDate: '2026-04-01', agreedRent: 8000, initialMeterReading: 1000 } })).body.data;
    tenantId = t.id;
    assignmentId = t.currentAssignment.id;
    billId = (await owner.post('/bills', { assignmentId, billingPeriod: '2026-09', electricity: { currentReading: 1150 }, charges: [{ type: 'MAINTENANCE', amount: 800 }] })).body.data.id;
  });
  afterAll(() => app.close());

  it('records a partial payment without changing the bill amount', async () => {
    const res = await pay(billId, 6000, { reference: 'UPI-123', notes: 'First half' }).expect(201);
    expect(res.body.message).toBe('Payment recorded successfully');
    expect(res.body.data.payment).toMatchObject({ amount: 6000, method: 'UPI', reference: 'UPI-123' });
    expect(res.body.data.bill).toMatchObject({ totalDue: 10000, paidAmount: 6000, balance: 4000, storedStatus: 'PARTIALLY_PAID' });
    expect(res.body.data.bill.rentAmount).toBe(8000);
    expect(res.body.data.bill.items.reduce((s: number, i: any) => s + i.amount, 0)).toBe(10000);
    expect((await owner.get(`/tenants/${tenantId}`)).body.data.outstanding).toBe(4000);
    expect((await owner.get(`/rooms/${roomId}`)).body.data.balance).toBe(4000);
  });

  it('rejects zero, negative, overpaying, malformed and future payments', async () => {
    await pay(billId, 0).expect(400);
    await pay(billId, -50).expect(400);
    const over = await pay(billId, 4000.01).expect(400);
    expect(over.body.message).toBe('Payment of Rs 4,000.01 is more than the balance of Rs 4,000');
    await pay(billId, 100.123).expect(400);
    await pay(billId, 100, { method: 'BITCOIN' }).expect(400);
    await pay(billId, 100, { paymentDate: '2099-01-01' }).expect(400);
    await pay(billId, 100, { paymentDate: '10/09/2026' }).expect(400);
    expect((await owner.get(`/bills/${billId}`)).body.data.paidAmount).toBe(6000);
  });

  it('completes the bill with the remaining balance and then refuses more', async () => {
    const res = await pay(billId, 4000, { method: 'CASH' }).expect(201);
    expect(res.body.data.bill).toMatchObject({ paidAmount: 10000, balance: 0, status: 'PAID' });
    const again = await pay(billId, 1).expect(409);
    expect(again.body.message).toBe('This bill is already fully paid');
    expect((await owner.get(`/tenants/${tenantId}`)).body.data.outstanding).toBe(0);
    expect((await owner.get(`/bills/${billId}`)).body.data.payments).toHaveLength(2);
  });

  it('never lets simultaneous payments exceed the bill', async () => {
    const oct = (await owner.post('/bills', { assignmentId, billingPeriod: '2026-10', electricity: { currentReading: 1250 }, charges: [] })).body.data;
    expect(oct.totalDue).toBe(8800);
    const results = await Promise.all([pay(oct.id, 5000), pay(oct.id, 5000), pay(oct.id, 5000)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400, 400]);
    const after = (await owner.get(`/bills/${oct.id}`)).body.data;
    expect(after.paidAmount).toBe(5000);
    expect(after.payments).toHaveLength(1);
  });

  it('applies a tenant-level payment to the open bill and reports it', async () => {
    const open = (await owner.get(`/tenants/${tenantId}/open-bill`)).body.data;
    expect(open).toMatchObject({ billNumber: expect.stringMatching(/^INV-202610-/), balance: 3800, label: 'October 2026' });
    const res = await owner.post('/payments', { tenantId, amount: 3800, paymentDate: '2026-10-02', method: 'BANK_TRANSFER' }).expect(201);
    expect(res.body.data.bill.status).toBe('PAID');
    expect((await owner.get(`/tenants/${tenantId}/open-bill`)).body.data).toBeNull();
    const none = await owner.post('/payments', { tenantId, amount: 1, paymentDate: '2026-10-02', method: 'CASH' }).expect(409);
    expect(none.body.message).toBe('This tenant has no unpaid bill');
  });

  it('routes payments to the newest bill when balances were carried forward', async () => {
    // A second tenant, billed for past months so the test does not depend on today's date
    const roomB = (await owner.post('/rooms', { propertyId, roomNumber: '102', defaultRent: 5000, electricityMode: 'NONE' })).body.data.id;
    const b = (await owner.post('/tenants', { fullName: 'Amit Kumar', phone: '9000000001', joiningDate: '2026-04-01', assignment: { roomId: roomB, startDate: '2026-04-01', agreedRent: 5000 } })).body.data;
    tenantB = b.id;
    const jun = (await owner.post('/bills', { assignmentId: b.currentAssignment.id, billingPeriod: '2026-06' })).body.data;
    const jul = (await owner.post('/bills', { assignmentId: b.currentAssignment.id, billingPeriod: '2026-07' })).body.data;
    julBillId = jul.id;
    expect(jul).toMatchObject({ previousBalance: 5000, totalDue: 10000 });
    const rejected = await pay(jun.id, 100).expect(409);
    expect(rejected.body.message).toBe(`This bill's balance was carried forward to ${jul.billNumber}. Record the payment there.`);
    expect((await owner.get(`/tenants/${tenantB}`)).body.data.outstanding).toBe(10000);
    expect((await owner.get(`/tenants/${tenantB}/open-bill`)).body.data.id).toBe(jul.id);
    await pay(jul.id, 2000, { method: 'CASH' }).expect(201);
    expect((await owner.get(`/tenants/${tenantB}`)).body.data.outstanding).toBe(8000);
    // the carried-forward June bill keeps its own record untouched
    expect((await owner.get(`/bills/${jun.id}`)).body.data).toMatchObject({ totalDue: 5000, paidAmount: 0 });
  });

  it('blocks cancelling bills that have payments', async () => {
    const cancel = await owner.post(`/bills/${julBillId}/cancel`, {}).expect(409);
    expect(cancel.body.message).toBe('This bill has payments recorded and cannot be cancelled');
  });

  it('keeps the payment ledger append-only and positive at the database level', async () => {
    const p = await prisma.payment.findFirstOrThrow();
    await expect(prisma.payment.update({ where: { id: p.id }, data: { amount: 1 } })).rejects.toThrow(/cannot be modified or deleted/);
    await expect(prisma.payment.delete({ where: { id: p.id } })).rejects.toThrow(/cannot be modified or deleted/);
    await expect(prisma.payment.create({ data: { billId, tenantId, amount: -5, paymentDate: new Date(), method: 'CASH' } })).rejects.toBeTruthy();
    await expect(prisma.payment.create({ data: { billId, tenantId, amount: 0, paymentDate: new Date(), method: 'CASH' } })).rejects.toBeTruthy();
    // and paid_amount can never exceed total_due even if application code were wrong
    await expect(prisma.bill.update({ where: { id: billId }, data: { paidAmount: 10000.01 } })).rejects.toBeTruthy();
  });

  it('lists payments with filters, pagination and a summary total', async () => {
    const all = (await owner.get(`/payments?propertyId=${propertyId}`)).body.data;
    expect(all.total).toBe(5);
    expect(all.summary).toEqual({ totalAmount: 6000 + 4000 + 5000 + 3800 + 2000, count: 5 });
    expect(all.items[0].tenant.fullName).toMatch(/Rahul Sharma|Amit Kumar/);
    expect(all.items.every((p: any) => p.bill.room.roomNumber)).toBe(true);

    expect((await owner.get('/payments?method=UPI')).body.data.summary).toEqual({ totalAmount: 6000 + 5000, count: 2 });
    expect((await owner.get('/payments?method=CASH')).body.data.summary.totalAmount).toBe(4000 + 2000);
    expect((await owner.get('/payments?from=2026-10-01&to=2026-10-31')).body.data.summary).toEqual({ totalAmount: 3800, count: 1 });
    expect((await owner.get('/payments?from=2026-09-01&to=2026-09-30')).body.data.summary).toEqual({ totalAmount: 6000 + 4000 + 5000 + 2000, count: 4 });
    expect((await owner.get('/payments?from=2026-11-01')).body.data.summary.count).toBe(0);
    expect((await owner.get(`/payments?tenantId=${tenantId}`)).body.data.total).toBe(4);
    expect((await owner.get(`/payments?tenantId=${tenantB}`)).body.data.summary.totalAmount).toBe(2000);
    expect((await owner.get('/payments?search=UPI-123')).body.data.total).toBe(1);
    const page = (await owner.get('/payments?page=2&pageSize=4')).body.data;
    expect(page.items).toHaveLength(1);
    expect(page.totalPages).toBe(2);
    await owner.get('/payments?method=NOPE').expect(400);
    await owner.get('/payments?from=yesterday').expect(400);
  });

  it('hides payments from other users', async () => {
    await other.post(`/bills/${billId}/payments`, { amount: 1, paymentDate: '2026-09-10', method: 'CASH' }).expect(404);
    await other.post('/payments', { tenantId, amount: 1, paymentDate: '2026-09-10', method: 'CASH' }).expect(404);
    await other.get(`/tenants/${tenantId}/open-bill`).expect(404);
    expect((await other.get('/payments')).body.data.total).toBe(0);
  });
});
