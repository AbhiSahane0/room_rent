/** Prints which database the backend is connected to (password hidden) and how many rows it holds. */
import './load-env';
import { PrismaClient } from '@prisma/client';

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  let where = '(DATABASE_URL not set)';
  try { const u = new URL(url); where = `${u.hostname}:${u.port || '5432'}${u.pathname}  (user ${decodeURIComponent(u.username)})`; } catch { /* keep default */ }
  console.log(`\nBackend database: ${where}`);
  console.log(/supabase|pooler/.test(url) ? '-> This looks like Supabase.' : '-> This is NOT a Supabase address. Data will not appear in your Supabase tables.');
  const prisma = new PrismaClient();
  const [users, properties, rooms, tenants, bills, payments] = await Promise.all([prisma.user.count(), prisma.property.count(), prisma.room.count(), prisma.tenant.count(), prisma.bill.count(), prisma.payment.count()]);
  console.log({ users, properties, rooms, tenants, bills, payments });
  const names = await prisma.user.findMany({ select: { username: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
  console.log('Accounts:', names.map((u) => u.username).join(', ') || '(none)', '\n');
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
