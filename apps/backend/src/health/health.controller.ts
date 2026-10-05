import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

/** Public, unauthenticated, never rate limited: for uptime monitors, Render's health check and "is the API up?" checks. */
@Public()
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /health: 200 as soon as the server is up. Does not touch the database, so it stays fast. */
  @Get('health')
  health() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()), time: new Date().toISOString() };
  }

  /** GET / : the same answer at the base address, so opening the API address in a browser is not a 404. */
  @Get()
  root() {
    return this.health();
  }

  /** GET /health/db: 200 only if the database answers a query, otherwise 503. */
  @Get('health/db')
  async db() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    }
    return { status: 'ok', database: 'up', latencyMs: Date.now() - started };
  }
}
