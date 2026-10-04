import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');
  constructor(private readonly prisma: PrismaService) {}

  /** Never pass secrets or document numbers in metadata. Failures must not break the request. */
  async log(userId: string | null, action: string, entity: string, entityId?: string, metadata?: Prisma.InputJsonValue) {
    try {
      await this.prisma.auditLog.create({ data: { userId, action, entity, entityId, metadata } });
    } catch {
      this.logger.warn(`Failed to write audit log for ${action}`);
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
