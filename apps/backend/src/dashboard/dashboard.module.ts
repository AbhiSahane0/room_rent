import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser) {
    const properties = await this.prisma.property.findMany({
      where: { ownerId: user.userId, isActive: true },
      select: { id: true, name: true, city: true, state: true },
      orderBy: { createdAt: 'asc' },
    });
    return { username: user.username, properties };
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.service.overview(user);
  }
}

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
