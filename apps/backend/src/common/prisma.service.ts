import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma's default interactive-transaction limit is 5 s, too tight when the database is in another region
    // (e.g. Supabase from a laptop or a Render free instance): it fails with "Transaction not found".
    super({
      transactionOptions: { maxWait: 15_000, timeout: 60_000 },
      ...(process.env.DEBUG_QUERIES ? { log: [{ emit: 'stdout' as const, level: 'query' as const }] } : {}),
    });
  }
  private keepAlive?: NodeJS.Timeout;

  async onModuleInit() {
    await this.$connect();
    if (process.env.NODE_ENV === 'test') return;
    // A remote database (Supabase) costs several network round trips to open each connection, and idle connections get dropped.
    // Opening a few at startup and touching them regularly means requests never wait for a reconnect.
    const ping = () => Promise.all([1, 2, 3, 4].map(() => this.$queryRaw`SELECT 1`)).catch(() => undefined);
    await ping();
    const every = Number(process.env.DB_KEEPALIVE_MS ?? 25_000);
    if (every > 0) {
      this.keepAlive = setInterval(() => void ping(), every);
      this.keepAlive.unref();
    }
  }
  async onModuleDestroy() {
    if (this.keepAlive) clearInterval(this.keepAlive);
    await this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
