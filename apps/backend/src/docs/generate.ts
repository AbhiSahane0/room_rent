import 'reflect-metadata';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { buildOpenApi } from './openapi';

/** `npm run docs:generate` — writes docs/openapi.json from the real controllers (needs the database settings in .env). */
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const out = resolve(__dirname, '../../../../docs/openapi.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(buildOpenApi(app), null, 2) + '\n');
  await app.close();
  console.log(`Wrote ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
