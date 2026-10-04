#!/usr/bin/env node
/**
 * Runs the Prisma CLI with the repository's schema after loading environment variables from
 * apps/backend/.env and then the repository root .env (either location works; the first value found wins).
 *   node scripts/prisma.js migrate deploy
 */
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

for (const file of [path.resolve(__dirname, '../.env'), path.resolve(__dirname, '../../../.env')]) dotenv.config({ path: file, quiet: true });

const missing = ['DATABASE_URL', 'DIRECT_URL'].filter((k) => !process.env[k]);
if (missing.length && process.argv[2] !== 'generate') {
  console.error(
    `\nMissing ${missing.join(' and ')}.\nAdd ${missing.join(' and ')} to apps/backend/.env (or the repository root .env).\n` +
      `With Supabase: DATABASE_URL is the pooled connection string (port 6543, add ?pgbouncer=true&connection_limit=1)\n` +
      `and DIRECT_URL is the direct connection string (port 5432). If you do not use a pooler, set both to the same value.\n`,
  );
  process.exit(1);
}
// "generate" does not connect, so give it placeholders when nothing is configured (e.g. in CI before a database exists).
if (process.argv[2] === 'generate') for (const k of ['DATABASE_URL', 'DIRECT_URL']) process.env[k] ??= 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

const schema = path.resolve(__dirname, '../../../prisma/schema.prisma');
const bin = require.resolve('prisma/build/index.js');
const res = spawnSync(process.execPath, [bin, ...process.argv.slice(2), '--schema', schema], { stdio: 'inherit', env: process.env });
process.exit(res.status ?? 1);
