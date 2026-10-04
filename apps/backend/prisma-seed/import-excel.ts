/**
 * Imports the owner's Excel rent register into the app (rooms, current tenants, the latest month's bills).
 *
 *   npm run -w @rental/backend prisma:import -- /path/to/RENT.xlsx [--dry-run]
 *     [--property-name "Name"] [--address "..."] [--city "..."] [--state "..."] [--pincode 411001] [--rate 12]
 *
 * Uses the real services, so every bill obeys the same rules as the app. The sheet's "Outstanding" figure becomes
 * each tenant's opening balance, and the sheet's "Monthly Payment" is checked against what the app calculates.
 * Safe to re-run: it stops if the property already exists. Phone numbers are not in the sheet and are left empty.
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

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--') && /\.xlsx$/i.test(a));
  if (!file) throw new Error('Usage: prisma:import -- <file.xlsx> [--dry-run] [--property-name "Name"] [--rate 12]');
  const dryRun = process.argv.includes('--dry-run');
  const rate = Number(arg('rate', '12'));

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
  if (await prisma.property.findFirst({ where: { ownerId: uid, name: propertyName } })) {
    console.log(`Property "${propertyName}" already exists. Nothing imported (use --property-name for a different one).`);
    return void (await app.close());
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
