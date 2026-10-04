import { execSync } from 'child_process';
import * as path from 'path';

/** Creates/migrates a throwaway test database so e2e tests run against real PostgreSQL. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://rent:rent@localhost:5432/room_rent_test';
  const schema = path.resolve(__dirname, '../../../prisma/schema.prisma');
  execSync(`npx prisma migrate deploy --schema ${schema}`, {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'pipe',
  });
}
