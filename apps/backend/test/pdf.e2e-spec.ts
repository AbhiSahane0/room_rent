import { NestExpressApplication } from '@nestjs/platform-express';
import pdfParse from 'pdf-parse';
import request from 'supertest';
import { renderBillPdf } from '../src/billing/bill-pdf';
import { renderBillStatementPdf, statementRows } from '../src/billing/bill-statement-pdf';
import { formatINR } from '../src/common/format';
import { PrismaService } from '../src/common/prisma.service';
import { createTestApp, createUserAndLogin, resetDb } from './helpers';

type Client = Awaited<ReturnType<typeof createUserAndLogin>>;


const fetchPdf = (c: Client, app: NestExpressApplication, url: string) =>
  request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${c.token}`).buffer(true).parse((res, cb) => {
    const chunks: Buffer[] = [];
    res.on('data', (d: Buffer) => chunks.push(d));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  });

describe('Bill PDF', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let owner: Client;
  let other: Client;
  let billId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDb(prisma);
    owner = await createUserAndLogin(app, prisma, 'owner');
    other = await createUserAndLogin(app, prisma, 'intruder');
    const propertyId = (await owner.post('/properties', { name: 'Sunrise Residency', address: '12 MG Road, Camp', city: 'Pune', state: 'Maharashtra', pincode: '411001' })).body.data.id;
    await owner.put(`/properties/${propertyId}`, { billPrefix: 'SUN', billFooterNote: 'Pay by the 10th via UPI: sunrise@upi' });
    const roomId = (await owner.post('/rooms', { propertyId, roomNumber: '101', defaultRent: 150000, electricityMode: 'METER', ratePerUnit: 8 })).body.data.id;
    const t = (await owner.post('/tenants', { fullName: 'Rahul Sharma', phone: '9876543210', joiningDate: '2026-04-01', assignment: { roomId, startDate: '2026-04-01', agreedRent: 150000, initialMeterReading: 1200 } })).body.data;
    billId = (await owner.post('/bills', {
      assignmentId: t.currentAssignment.id, billingPeriod: '2026-09', electricity: { currentReading: 1350 },
      charges: [{ type: 'MAINTENANCE', amount: 500 }, { type: 'WATER', amount: 200 }], discount: 300,
    })).body.data.id;
    await owner.post(`/bills/${billId}/payments`, { amount: 5000, paymentDate: '2026-09-10', method: 'UPI', reference: 'UTR998877' }).expect(201);
  });
  afterAll(() => app.close());

  it('formats Indian rupees with lakh grouping', () => {
    expect(formatINR(150000)).toBe('₹1,50,000');
    expect(formatINR(1234567.5)).toBe('₹12,34,567.50');
    expect(formatINR(999)).toBe('₹999');
    expect(formatINR(-3900)).toBe('-₹3,900');
  });

  it('serves a real PDF containing every invoice detail', async () => {
    const res = await fetchPdf(owner, app, `/bills/${billId}/pdf?format=invoice`).expect(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="Invoice-SUN-202609-0001.pdf"');
    expect(res.headers['cache-control']).toMatch(/no-store|private/);
    const pdf = res.body as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5_000);

    const parsed = await pdfParse(pdf);
    expect(parsed.numpages).toBe(1);
    const text = parsed.text.replace(/\s+/g, ' ');
    for (const expected of [
      'Sunrise Residency', '12 MG Road, Camp', 'Pune, Maharashtra - 411001', 'INVOICE', 'SUN-202609-0001', 'PARTIALLY PAID', '(overdue)',
      'Rahul Sharma', 'Room 101', '9876543210', 'September 2026', '10 Sep 2026' /* due */, 'Rent', 'Electricity', '1200 to 1350', '150 units',
      'Maintenance', 'Water', 'Discount', '₹1,50,000', '₹1,200', '₹500', '₹200', '-₹300',
      'Total', '₹1,51,600', 'Paid', '₹5,000', 'Balance due', '₹1,46,600', 'PAYMENTS RECEIVED', 'UPI', 'UTR998877', 'Pay by the 10th via UPI: sunrise@upi', 'does not require a signature',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('can be requested as a download', async () => {
    const res = await fetchPdf(owner, app, `/bills/${billId}/pdf?format=invoice&download=1`).expect(200);
    expect(res.headers['content-disposition']).toBe('attachment; filename="Invoice-SUN-202609-0001.pdf"');
  });

  it('is private: needs login and the owner of the bill', async () => {
    await request(app.getHttpServer()).get(`/bills/${billId}/pdf`).expect(401);
    await fetchPdf(other, app, `/bills/${billId}/pdf`).expect(404);
  });

  it('shows PAID once settled and CANCELLED for cancelled bills', async () => {
    await owner.post(`/bills/${billId}/payments`, { amount: 146600, paymentDate: '2026-09-12', method: 'CASH' }).expect(201);
    const paid = (await pdfParse((await fetchPdf(owner, app, `/bills/${billId}/pdf?format=invoice`)).body)).text.replace(/\s+/g, ' ');
    expect(paid).toContain('PAID');
    expect(paid).not.toContain('PARTIALLY PAID');
    expect(paid).toContain('₹0');
  });

  it('renders long invoices over several pages without failing', async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ type: 'CHARGE', description: `Extra charge number ${i + 1} with a reasonably long description to exercise wrapping`, amount: 100 + i }));
    const pdf = await renderBillPdf({
      billNumber: 'X-1', billingPeriod: new Date('2026-09-01'), dueDate: new Date('2026-09-10'), createdAt: new Date(), status: 'OVERDUE',
      rentAmount: 1, electricityAmount: 0, otherChargesAmount: 0, lateFee: 0, discount: 0, previousBalance: 500, totalDue: 9999, paidAmount: 0, balance: 9999,
      items, payments: [], tenant: { fullName: 'Long Name Tenant', phone: '9000000000' }, room: { roomNumber: '1' },
      property: { name: 'P', address: 'A', city: 'C', state: 'S', pincode: '111111' },
    });
    const parsed = await pdfParse(pdf);
    expect(parsed.numpages).toBeGreaterThan(1);
    expect(parsed.text).toContain('Extra charge number 60');
  });

  describe("owner's monthly rent form (statement)", () => {
    const sample = (over: object = {}, items?: any[]) => ({
      billNumber: 'INV-202608-0001', billingPeriod: new Date('2026-08-01'), dueDate: new Date('2026-08-10'), createdAt: new Date(), status: 'GENERATED',
      rentAmount: 6000, electricityAmount: 1080, otherChargesAmount: 200, lateFee: 0, discount: 0, previousBalance: 1000, totalDue: 8280, paidAmount: 0, balance: 8280,
      items: items ?? [
        { type: 'RENT', description: 'Rent', amount: 6000 }, { type: 'ELECTRICITY', description: 'Electricity', amount: 1080 },
        { type: 'CHARGE', description: 'Society Electricity', amount: 200 }, { type: 'PREVIOUS_BALANCE', description: 'Previous balance', amount: 1000 },
      ],
      payments: [], tenant: { fullName: 'Rajkumar Darsimbe', phone: '' }, room: { roomNumber: '1' },
      property: { name: 'Home', address: 'A', city: 'C', state: 'S', pincode: '411001' }, ...over,
    });

    it('is the default PDF and lays out exactly the rows of the owner\'s form', async () => {
      const rows = statementRows(sample() as any);
      expect(rows.map((r) => [r.label, r.value])).toEqual([
        ['Tenant Name', 'Rajkumar Darsimbe'], ['Room No', '1'], ['Month', 'Aug-26'], ['Monthly Rental', '6000'], ['Personal Electricity', '1080'],
        ['Society Electricity', '200'], ['Society Maintenance', '0'], ['Outstanding :', '1000'], ['Monthly Payment :', '8280'],
      ]);
      const pdf = await renderBillStatementPdf(sample() as any);
      const parsed = await pdfParse(pdf);
      expect(parsed.numpages).toBe(1);
      for (const t of ['Tenant Name', 'Rajkumar Darsimbe', 'Aug-26', 'Society Maintenance', 'Outstanding', 'Monthly Payment', '8280']) expect(parsed.text.replace(/\s+/g, ' ')).toContain(t);
    });

    it('keeps extra charges, late fee, discount and payments so the form always adds up', () => {
      const items = [
        { type: 'RENT', description: 'Rent', amount: 5000 }, { type: 'CHARGE', description: 'Society Electricity', amount: 200 },
        { type: 'CHARGE', description: 'Society Maintenance', amount: 150 }, { type: 'CHARGE', description: 'Water', amount: 100 },
        { type: 'LATE_FEE', description: 'Late fee', amount: 50 }, { type: 'DISCOUNT', description: 'Discount', amount: -100 },
      ];
      const rows = statementRows(sample({ totalDue: 5400, paidAmount: 2000, balance: 3400 }, items) as any);
      const map = Object.fromEntries(rows.map((r) => [r.label, r.value]));
      expect(map).toMatchObject({ 'Society Maintenance': '150', Water: '100', 'Late Fee': '50', Discount: '-100', 'Outstanding :': '0', 'Monthly Payment :': '5400', 'Paid :': '2000', 'Balance :': '3400' });
    });

    it('is what the bill endpoint serves by default', async () => {
      const res = await fetchPdf(owner, app, `/bills/${billId}/pdf`).expect(200);
      const text = (await pdfParse(res.body)).text.replace(/\s+/g, ' ');
      expect(text).toContain('Sunrise Residency');
      expect(text).toContain('Rahul Sharma');
      expect(text).toContain('Monthly Payment');
      expect(text).not.toContain('INVOICE');
    });
  });
});
