# Rent Manager

Mobile rental / room management app for a property owner (React Native + Expo) with a NestJS + Prisma + PostgreSQL
backend and private Cloudflare R2 document storage. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design decisions.

```
apps/mobile    Expo (Android first, iOS-ready), Expo Router, NativeWind, TanStack Query
apps/backend   NestJS REST API, Prisma, argon2, JWT access + rotating refresh sessions
packages/shared  Shared enums / types
prisma/        schema.prisma + SQL migrations (includes DB-level business rules)
```

## Getting started

```bash
npm install
cp .env.example apps/backend/.env      # then fill in your keys (see below)
npm run db:migrate                     # or: npm run -w @rental/backend prisma:deploy
npm run db:seed                        # creates the owner account (SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD)
npm run backend                        # API on :3000
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_API_URL
npm run mobile                         # Expo dev server
```

Android emulator reaches the host machine at `http://10.0.2.2:3000`; on a physical device use your computer's LAN IP.
Note: Expo Go is enough for the current screens; document capture/sharing may need a development build
(`npx expo run:android`).

## Environment variables

Backend (`apps/backend/.env`): `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
Mobile (`apps/mobile/.env`): `EXPO_PUBLIC_API_URL` only. **Never** put secrets in `EXPO_PUBLIC_*`.

Supabase: use the pooled connection string (port 6543, `?pgbouncer=true`) as `DATABASE_URL` and the direct
connection (port 5432) as `DIRECT_URL` (used by `prisma migrate`).

## Checks

```bash
npm run typecheck && npm run lint && npm test
```
Backend e2e tests run against a real PostgreSQL database (`room_rent_test` by default; override with `TEST_DATABASE_URL`).
