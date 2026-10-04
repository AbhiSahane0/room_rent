/**
 * Imports the owner's Excel rent register into the app (rooms, current tenants, the latest month's bills).
 *
 *   npm run db:import -- /path/to/RENT.xlsx [--dry-run] [--replace]
 *     [--property-name "Name"] [--address "..."] [--city "..."] [--state "..."] [--pincode 411001] [--rate 12]
 *     [--current-only]   only the latest month's tenants and bills (no history)
 *
 * By default the WHOLE history in the Billing sheet is imported: every tenant who ever lived there, their stays, every monthly
 * bill since 2017 and the payments derived from the register (see history-plan.ts). Bill totals equal the sheet.
 * Safe to re-run: it stops if the property already exists; --replace deletes that property's data first and imports again.
 * Phone numbers are not in the sheet and are left empty.
 */
import './load-env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { BillsService } from '../src/billing/bills.service';
import { PrismaService } from '../src/common/prisma.service';
import { PropertiesService } from '../src/properties/properties.service';
import { RoomsService } from '../src/rooms/rooms.service';
import { TenantsService } from '../src/tenants/tenants.service';
import { currentTenants, parseBillingSheet } from './excel-parser';
import { buildHistoryPlan } from './history-plan';
import { writeHistory, wipeProperty } from './import-history';
import { PrismaClient } from '@prisma/client';

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const inr = (n: number) => `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function importHistory(file: string, dryRun: boolean, rate: number) {
  const plan = buildHistoryPlan(await parseBillingSheet(file));
  const current = plan.tenants.filter((t) => t.stints.some((s) => s.current));
  const former = plan.tenants.filter((t) => !t.stints.some((s) => s.current));
  console.log(`\nRegister covers ${plan.firstMonth} to ${plan.lastMonth}: ${plan.rooms.length} rooms, ${plan.tenants.length} tenants (${current.length} current), ${plan.stats.bills} monthly bills, ${plan.stats.payments} payments derived.`);
  for (const w of plan.warnings) console.log(`  note: ${w}`);
  if (plan.stats.adjustments) console.log(`  note: ${plan.stats.adjustments} bills needed an "Adjustment as per register" line (net ${inr(plan.stats.adjustmentTotal)}) because the sheet's own totals do not follow from its columns.`);

  console.log('\nCurrent tenants (billed in ' + plan.lastMonth + ', unpaid until you record their payment):');
  for (const t of current) {
    const last = t.stints[t.stints.length - 1];
    console.log(`  Room ${last.room.padEnd(7)} ${t.name.padEnd(20)} since ${last.entries[0].month}  ${plan.lastMonth} bill ${inr(last.entries[last.entries.length - 1].total)}`);
  }
  console.log('\nFormer tenants who still owe money (collect from the Tenants tab, or write off):');
  const owing = former.filter((t) => t.due > 0).sort((a, b) => b.due - a.due);
  for (const t of owing) console.log(`  ${t.name.padEnd(22)} left ${t.stints[t.stints.length - 1].entries.at(-1)!.month}  owes ${inr(t.due)}`);
  console.log(`  Total owed by former tenants: ${inr(owing.reduce((n, t) => n + t.due, 0))} from ${owing.length} people`);
  console.log('\nAll tenants, oldest first (check the names and rooms look right):');
  for (const t of plan.tenants) console.log(`  ${t.name.padEnd(22)} ${t.stints.map((s) => `Room ${s.room} ${s.entries[0].month} to ${s.entries[s.entries.length - 1].month}`).join(', ')}`);
  if (dryRun) return console.log('\nDry run: nothing was written.');

  const prisma = new PrismaClient({ transactionOptions: { maxWait: 30_000, timeout: 600_000 } });
  try {
    const username = process.env.SEED_ADMIN_USERNAME ?? 'owner';
    let user = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
    if (!user) {
      const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
      if (process.env.NODE_ENV === 'production' && (password === 'ChangeMe123!' || password.length < 12)) throw new Error('Set a strong SEED_ADMIN_PASSWORD (12+ characters) first.');
      user = await prisma.user.create({ data: { username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
      console.log(`Created owner account "${username}".`);
    }
    const propertyName = arg('property-name', process.env.IMPORT_PROPERTY_NAME ?? 'My Property')!;
    const existing = await prisma.property.findFirst({ where: { ownerId: user.id, name: propertyName } });
    if (existing) {
      if (!process.argv.includes('--replace')) {
        console.log(`\nProperty "${propertyName}" already exists. Nothing imported. Add --replace to delete its data and import the full history, or use --property-name for a new property.`);
        return;
      }
      console.log(`\nRemoving the existing "${propertyName}" and everything under it...`);
      await wipeProperty(prisma, existing.id);
    }
    console.log('Writing...');
    const res = await writeHistory(prisma, plan, {
      ownerId: user.id, propertyName, address: arg('address', 'Address not set yet')!, city: arg('city', '-')!, state: arg('state', 'Maharashtra')!, pincode: arg('pincode', '000000')!,
      ratePerUnit: rate, dueDay: 10, billPrefix: 'INV',
    });

    // Verify against the database, not the plan.
    const bills = await prisma.bill.findMany({ where: { propertyId: res.propertyId, carriedForwardToId: null, status: { not: 'CANCELLED' } }, select: { tenantId: true, totalDue: true, paidAmount: true } });
    const owed = bills.reduce((n, b) => n + b.totalDue.toNumber() - b.paidAmount.toNumber(), 0);
    const expected = plan.tenants.reduce((n, t) => n + t.due, 0);
    console.log(`\nImported ${res.tenants} tenants, ${res.bills} bills and ${res.payments} payments.`);
    console.log(`Total outstanding in the app: ${inr(owed)}  (register says ${inr(expected)}) ${Math.abs(owed - expected) < 0.01 ? 'OK' : '<-- MISMATCH'}`);
    if (Math.abs(owed - expected) >= 0.01) throw new Error('Outstanding balance does not match the register.');
    console.log('Done. Update the address (More > Properties) and add phone numbers from each tenant profile.');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--') && /\.xlsx$/i.test(a));
  if (!file) throw new Error('Usage: prisma:import -- <file.xlsx> [--dry-run] [--property-name "Name"] [--rate 12]');
  const dryRun = process.argv.includes('--dry-run');
  const rate = Number(arg('rate', '12'));
  if (!process.argv.includes('--current-only')) return importHistory(file, dryRun, rate);

  const { month, tenants } = currentTenants(await parseBillingSheet(file));
  console.log(`Latest month in the sheet: ${month}. ${tenants.length} current tenants.`);
  for (const t of tenants) {
    const expected = t.rent + t.personalElectricity + t.societyElectricity + t.societyMaintenance + Math.max(0, t.outstanding);
    const note = t.total != null && t.total !== expected ? `  <-- sheet total ${t.total}, computed ${expected}` : '';
    console.log(`  Room ${t.room.padEnd(4)} ${t.name.padEnd(22)} since ${t.since}  rent ${t.rent}  elec ${t.personalElectricity}  society ${t.societyElectricity}  maint ${t.societyMaintenance}  outstanding ${t.outstanding}  = ${expected}${note}`);
    if (t.outstanding < 0) console.log(`    note: negative outstanding (${t.outstanding}) is an advance credit; it is not imported.`);
    if (t.total != null && t.total !== expected && t.outstanding >= 0) throw new Error(`Room ${t.room}: the sheet total does not match its own components. Fix the sheet first.`);
  }
  if (dryRun) return console.log('Dry run: nothing was written.');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const properties = app.get(PropertiesService);
  const rooms = app.get(RoomsService);
  const tenantsService = app.get(TenantsService);
  const bills = app.get(BillsService);

  const username = process.env.SEED_ADMIN_USERNAME ?? 'owner';
  let user = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
  if (!user) {
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
    if (process.env.NODE_ENV === 'production' && (password === 'ChangeMe123!' || password.length < 12)) throw new Error('Set a strong SEED_ADMIN_PASSWORD (12+ characters) first.');
    user = await prisma.user.create({ data: { username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
    console.log(`Created owner account "${username}".`);
  }
  const uid = user.id;

  const propertyName = arg('property-name', process.env.IMPORT_PROPERTY_NAME ?? 'My Property')!;
  const existing = await prisma.property.findFirst({ where: { ownerId: uid, name: propertyName } });
  if (existing) {
    if ((await prisma.bill.count({ where: { propertyId: existing.id } })) > 0) {
      console.log(`Property "${propertyName}" already exists with bills. Nothing imported (use --property-name for a different one).`);
      return void (await app.close());
    }
    // A previous run stopped half way (nothing was billed yet): clear its leftovers and start again.
    if ((await prisma.tenant.count({ where: { propertyId: existing.id } })) > 0) {
      console.log(`Property "${propertyName}" already has tenants but no bills (an interrupted import). Delete that property in Supabase (or use --property-name for a new one) and run again.`);
      return void (await app.close());
    }
    console.log('Removing the leftovers of an interrupted import, then importing again.');
    await prisma.$transaction([prisma.room.deleteMany({ where: { propertyId: existing.id } }), prisma.property.delete({ where: { id: existing.id } })]);
  }

  const property = await properties.create(uid, {
    name: propertyName,
    address: arg('address', 'Address not set yet')!,
    city: arg('city', '-')!,
    state: arg('state', 'Maharashtra')!,
    pincode: arg('pincode', '000000')!,
  });
  await properties.update(uid, property.id, { defaultRatePerUnit: rate, dueDayOfMonth: 10 });

  for (const t of tenants) {
    const room = await rooms.create(uid, { propertyId: property.id, roomNumber: t.room, defaultRent: t.rent, electricityMode: 'METER', ratePerUnit: rate });
    const opening = Math.max(0, t.outstanding);
    const tenant = await tenantsService.create(uid, {
      fullName: t.name,
      phone: '', // not in the spreadsheet; add it from the tenant profile
      joiningDate: `${t.since}-01`,
      assignment: { roomId: room.id, startDate: `${t.since}-01`, agreedRent: t.rent, securityDeposit: 0, electricityMode: 'METER', ratePerUnit: rate, initialMeterReading: 0, openingBalance: opening },
    });
    const assignmentId = tenant.currentAssignment!.id;
    if (t.societyElectricity > 0) await bills.addCharge(uid, assignmentId, { type: 'OTHER', name: 'Society Electricity', amount: t.societyElectricity });

    const charges = [
      ...(t.societyElectricity > 0 ? [{ type: 'OTHER' as const, name: 'Society Electricity', amount: t.societyElectricity }] : []),
      ...(t.societyMaintenance > 0 ? [{ type: 'MAINTENANCE' as const, name: 'Society Maintenance', amount: t.societyMaintenance }] : []),
    ];
    const bill = await bills.create(uid, { assignmentId, billingPeriod: month, electricity: { overrideAmount: t.personalElectricity }, charges });
    const due = bill.totalDue.toNumber();
    const expected = t.rent + t.personalElectricity + t.societyElectricity + t.societyMaintenance + opening;
    if (due !== expected) throw new Error(`Room ${t.room}: the app calculated ${due} but the sheet says ${expected}.`);
    console.log(`  imported Room ${t.room} ${t.name}: bill ${bill.billNumber} = ${due}`);
  }
  console.log(`Done. Property "${propertyName}" with ${tenants.length} rooms, tenants and ${month} bills. Remember to update the address (More > Properties) and add phone numbers.`);
  await app.close();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
