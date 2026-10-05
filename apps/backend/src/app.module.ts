import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuditModule } from './common/audit.service';
import { HealthController } from './health/health.controller';
import { validateEnv } from './common/env';
import { PrismaModule } from './common/prisma.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { TenantsModule } from './tenants/tenants.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }], skipIf: () => process.env.NODE_ENV === 'test' }),
    PrismaModule,
    AuditModule,
    AuthModule,
    DashboardModule,
    PropertiesModule,
    RoomsModule,
    AssignmentsModule,
    TenantsModule,
    StorageModule,
    DocumentsModule,
    BillingModule,
    PaymentsModule,
    ReportsModule,
    ExportsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
