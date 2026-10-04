import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';
import { ReportQuery } from '../reports/reports.dto';
import { ReportsModule } from '../reports/reports.module';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly reports: ReportsService) {}

  /** Everything the Home screen shows, in one request. Numbers come from the same code as the reports. */
  async overview(user: AuthUser, q: ReportQuery) {
    const properties = await this.prisma.property.findMany({
      where: { ownerId: user.userId, isActive: true },
      select: { id: true, name: true, city: true, state: true },
      orderBy: { createdAt: 'asc' },
    });
    const selected = properties.find((p) => p.id === q.propertyId) ?? properties[0] ?? null;
    if (!selected) return { username: user.username, properties, property: null, collection: null, occupancy: null, pendingPayments: [] };

    const scope = { propertyId: selected.id };
    const [collection, occupancy, outstanding] = await Promise.all([
      this.reports.collection(user.userId, { ...scope, month: q.month }),
      this.reports.occupancy(user.userId, scope),
      this.reports.outstanding(user.userId, scope),
    ]);
    const { month, monthLabel, expected, collected, paymentCount, pending, collectionRate } = collection;
    return {
      username: user.username,
      properties,
      property: selected,
      collection: { month, monthLabel, expected, collected, paymentCount, pending, collectionRate },
      occupancy: { totalRooms: occupancy.totalRooms, occupied: occupancy.occupied, vacant: occupancy.vacant, maintenance: occupancy.maintenance, occupancyPercent: occupancy.occupancyPercent },
      pendingPayments: outstanding.items.slice(0, 5),
      pendingCount: outstanding.count,
    };
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @Query() q: ReportQuery) {
    return this.service.overview(user, q);
  }
}

@Module({ imports: [ReportsModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
