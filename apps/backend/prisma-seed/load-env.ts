import * as dotenv from 'dotenv';
import * as path from 'path';

/** Reads apps/backend/.env first, then the repository root .env, so either location works. Existing values win. */
for (const file of [path.resolve(__dirname, '../.env'), path.resolve(__dirname, '../../../.env')]) dotenv.config({ path: file, quiet: true });
