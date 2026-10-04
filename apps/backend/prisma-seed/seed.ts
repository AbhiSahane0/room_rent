import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

export async function ensureAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME ?? 'owner';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const existing = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
  if (existing) return existing;
  return prisma.user.create({
    data: { username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) },
  });
}

async function main() {
  const admin = await ensureAdmin();
  console.log(`Owner account ready: ${admin.username}`);
}

main().finally(() => prisma.$disconnect());
