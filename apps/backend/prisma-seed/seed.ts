/**
 * Seeds the owner account and (outside production) realistic demo data.
 * Demo data is created through the real services, so bills, balances and payments obey
 * exactly the same rules as the app. Safe to run repeatedly: it skips if the demo property exists.
 */
import './load-env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PaymentMethod } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { AssignmentsService } from '../src/assignments/assignments.service';
import { BillsService } from '../src/billing/bills.service';
import { PrismaService } from '../src/common/prisma.service';
import { PaymentsService } from '../src/payments/payments.service';
import { PropertiesService } from '../src/properties/properties.service';
import { RoomsService } from '../src/rooms/rooms.service';
import { TenantsService } from '../src/tenants/tenants.service';

const pad = (n: number) => String(n).padStart(2, '0');
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const day = (d: Date, dd: number) => `${ym(d)}-${pad(dd)}`;

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);

  const username = process.env.SEED_ADMIN_USERNAME ?? 'owner';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  if (process.env.NODE_ENV === 'production' && (password === 'ChangeMe123!' || password.length < 12)) {
    throw new Error('Set SEED_ADMIN_PASSWORD to a strong password (12+ characters) before seeding production.');
  }
  let user = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
  if (!user) user = await prisma.user.create({ data: { username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  else if (process.argv.includes('--reset-password')) {
    // Recovery path when the password is forgotten: sets SEED_ADMIN_PASSWORD, re-enables the account and signs out every session.
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }), isActive: true } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    console.log('Password reset from SEED_ADMIN_PASSWORD; all sessions signed out.');
  }
  console.log(`Owner account ready: ${user.username}`);

  if (process.env.NODE_ENV === 'production' || process.argv.includes('--admin-only') || process.argv.includes('--reset-password')) return void (await app.close());
  if (await prisma.property.findFirst({ where: { ownerId: user.id, name: 'Sunrise Residency' } })) {
    console.log('Demo data already present, skipping.');
    return void (await app.close());
  }

  const properties = app.get(PropertiesService);
  const rooms = app.get(RoomsService);
  const tenants = app.get(TenantsService);
  const assignments = app.get(AssignmentsService);
  const bills = app.get(BillsService);
  const payments = app.get(PaymentsService);
  const uid = user.id;

  const property = await properties.create(uid, { name: 'Sunrise Residency', address: '12 MG Road, Camp', city: 'Pune', state: 'Maharashtra', pincode: '411001', description: 'Four-storey residential building near the station' });
  await properties.update(uid, property.id, { billPrefix: 'SUN', dueDayOfMonth: 10, defaultRatePerUnit: 8, billFooterNote: 'Please pay by the due date via UPI or cash. Thank you!' });

  const room: Record<string, { id: string }> = {};
  for (const [n, rent, floor] of [['101', 8000, 'Ground'], ['102', 8000, 'Ground'], ['103', 7500, '1st'], ['104', 7500, '1st'], ['105', 9000, '2nd']] as const) {
    room[n] = await rooms.create(uid, { propertyId: property.id, roomNumber: n, floor, defaultRent: rent, electricityMode: 'METER', ratePerUnit: 8 });
  }

  const now = new Date();
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const m1 = addMonths(m0, -1);
  const m2 = addMonths(m0, -2);

  // Amit Kumar: first in Room 101 (2025), moved out, now back in Room 103 (room history across two assignments)
  const amit = await tenants.create(uid, { fullName: 'Amit Kumar', phone: '9822001122', email: 'amit.kumar@example.com', occupation: 'Accountant', joiningDate: '2025-01-01', emergencyContact: 'Sunita Kumar', emergencyPhone: '9822003344', assignment: { roomId: room['101'].id, startDate: '2025-01-01', agreedRent: 7500, securityDeposit: 15000, initialMeterReading: 500 } });
  await assignments.moveOut(uid, amit.currentAssignment!.id, { moveOutDate: '2025-12-31', finalMeterReading: 1180, notes: 'Moved to a bigger room. Deposit adjusted against next stay.' });
  const amitStay = await assignments.create(uid, { tenantId: amit.id, roomId: room['103'].id, startDate: ymStart(m2), agreedRent: 7500, securityDeposit: 15000, initialMeterReading: 2000 });

  const rahul = await tenants.create(uid, { fullName: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@example.com', occupation: 'Software engineer', joiningDate: '2026-04-01', permanentAddress: '14 Lake View, Nashik', emergencyContact: 'Mohan Sharma', emergencyPhone: '9876500011', assignment: { roomId: room['101'].id, startDate: '2026-04-01', agreedRent: 8000, securityDeposit: 16000, initialMeterReading: 1200 } });
  const priya = await tenants.create(uid, { fullName: 'Priya Shah', phone: '9922334455', email: 'priya.shah@example.com', occupation: 'Designer', joiningDate: ymStart(m2), emergencyContact: 'Hetal Shah', emergencyPhone: '9922334400', assignment: { roomId: room['102'].id, startDate: ymStart(m2), agreedRent: 8000, securityDeposit: 16000, initialMeterReading: 300 } });
  await rooms.update(uid, room['105'].id, { status: 'MAINTENANCE', notes: 'Repainting and plumbing work' });
  await assignments.changeRent(uid, rahul.currentAssignment!.id, { amount: 8500, effectiveFrom: `${ym(m0)}-01` });

  const aR = rahul.currentAssignment!.id;
  const aP = priya.currentAssignment!.id;
  const aA = amitStay.id;
  const pay = (billId: string, amount: number, method: PaymentMethod, date: string, reference?: string) => payments.record(uid, billId, { amount, method, paymentDate: date, reference });

  // Rahul: August paid, September part-paid (balance carries into this month)
  const rAug = await bills.create(uid, { assignmentId: aR, billingPeriod: ym(m2), electricity: { currentReading: 1290 }, charges: [{ type: 'MAINTENANCE', amount: 500 }] });
  await pay(rAug.id, rAug.totalDue.toNumber(), 'CASH', day(m2, 6));
  const rSep = await bills.create(uid, { assignmentId: aR, billingPeriod: ym(m1), electricity: { currentReading: 1350 }, charges: [{ type: 'MAINTENANCE', amount: 500 }, { type: 'WATER', amount: 200 }] });
  await pay(rSep.id, 6000, 'UPI', day(m1, 12), 'UPI-4821907365');
  await bills.create(uid, { assignmentId: aR, billingPeriod: ym(m0), electricity: { currentReading: 1410 }, charges: [{ type: 'MAINTENANCE', amount: 500 }, { type: 'WATER', amount: 200 }] });

  // Priya: Sep and this month both paid
  const pAug = await bills.create(uid, { assignmentId: aP, billingPeriod: ym(m2), electricity: { currentReading: 380 }, charges: [{ type: 'INTERNET', amount: 300 }] });
  await pay(pAug.id, pAug.totalDue.toNumber(), 'UPI', day(m2, 4), 'UPI-3317760021');
  const pSep = await bills.create(uid, { assignmentId: aP, billingPeriod: ym(m1), electricity: { currentReading: 455 }, charges: [{ type: 'INTERNET', amount: 300 }] });
  await pay(pSep.id, pSep.totalDue.toNumber(), 'BANK_TRANSFER', day(m1, 3), 'NEFT-90071234');
  const pOct = await bills.create(uid, { assignmentId: aP, billingPeriod: ym(m0), electricity: { currentReading: 520 }, charges: [{ type: 'INTERNET', amount: 300 }] });
  await pay(pOct.id, pOct.totalDue.toNumber(), 'UPI', day(m0, Math.min(now.getDate(), 3)), 'UPI-5509318842');

  // Amit: earlier months paid, this month unpaid
  const aAug = await bills.create(uid, { assignmentId: aA, billingPeriod: ym(m2), electricity: { currentReading: 2090 }, charges: [{ type: 'MAINTENANCE', amount: 500 }] });
  await pay(aAug.id, aAug.totalDue.toNumber(), 'CASH', day(m2, 9));
  const aSep = await bills.create(uid, { assignmentId: aA, billingPeriod: ym(m1), electricity: { currentReading: 2185 }, charges: [{ type: 'MAINTENANCE', amount: 500 }] });
  await pay(aSep.id, aSep.totalDue.toNumber(), 'CASH', day(m1, 8));
  await bills.create(uid, { assignmentId: aA, billingPeriod: ym(m0), electricity: { currentReading: 2260 }, charges: [{ type: 'MAINTENANCE', amount: 500 }] });

  console.log('Demo data created: Sunrise Residency, rooms 101-105, tenants Rahul Sharma, Amit Kumar, Priya Shah, with bills and payments.');
  await app.close();
}

function ymStart(d: Date) {
  return `${ym(d)}-01`;
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
