import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuditModule } from './common/audit.service';
import { Public } from './common/decorators';
import { validateEnv } from './common/env';
import { PrismaModule } from './common/prisma.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { TenantsModule } from './tenants/tenants.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';

@Controller('health')
class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}

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
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
