import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

/** Creates (if missing) and migrates a throwaway test database so e2e tests run against real PostgreSQL. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://rent:rent@localhost:5432/room_rent_test';
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, '');
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error(`Unsafe test database name: ${dbName}`);
  if (!/test/i.test(dbName)) throw new Error(`Refusing to run tests against "${dbName}": the database name must contain "test"`);

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new PrismaClient({ datasources: { db: { url: admin.toString() } } });
  try {
    const exists = await client.$queryRawUnsafe<{ n: number }[]>(`SELECT 1 AS n FROM pg_database WHERE datname = '${dbName}'`);
    if (exists.length === 0) await client.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.$disconnect();
  }

  const schema = path.resolve(__dirname, '../../../prisma/schema.prisma');
  execSync(`npx prisma migrate deploy --schema ${schema}`, {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'pipe',
  });
}
