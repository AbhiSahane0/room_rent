import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma's default interactive-transaction limit is 5 s, too tight when the database is in another region
    // (e.g. Supabase from a laptop or a Render free instance): it fails with "Transaction not found".
    super({ transactionOptions: { maxWait: 15_000, timeout: 60_000 } });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
