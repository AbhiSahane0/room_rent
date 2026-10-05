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
    const listProperties = () =>
      this.prisma.property.findMany({ where: { ownerId: user.userId, isActive: true }, select: { id: true, name: true, city: true, state: true }, orderBy: { createdAt: 'asc' } });
    // Everything for one property, started in parallel (one network round trip in total). `ids` are only trusted once the property list confirms them.
    const load = (ids: string[]) => {
      const outstanding = this.reports.outstandingFor(ids);
      return Promise.all([this.reports.collectionFor(ids, q.month, outstanding.then((o) => o.total)), this.reports.occupancyFor(ids), outstanding, this.reports.extrasFor(ids)]);
    };

    // The client normally names the property, so its data is fetched at the same time as the property list instead of after it.
    let properties: Awaited<ReturnType<typeof listProperties>>;
    let loaded: Awaited<ReturnType<typeof load>> | null = null;
    if (q.propertyId) {
      const [list, data] = await Promise.all([listProperties(), load([q.propertyId])]);
      properties = list;
      if (list.some((p) => p.id === q.propertyId)) loaded = data;
    } else {
      properties = await listProperties();
    }
    const selected = properties.find((p) => p.id === q.propertyId) ?? properties[0] ?? null;
    if (!selected) return { username: user.username, properties, property: null, collection: null, occupancy: null, pendingPayments: [] };
    // A remembered property that no longer exists falls back to the first one.
    const [collection, occupancy, outstanding, extras] = loaded ?? (await load([selected.id]));
    const { month, monthLabel, expected, collected, paymentCount, pending, collectionRate } = collection;
    return {
      username: user.username,
      properties,
      property: selected,
      collection: { month, monthLabel, expected, collected, paymentCount, pending, collectionRate },
      occupancy: { totalRooms: occupancy.totalRooms, occupied: occupancy.occupied, vacant: occupancy.vacant, maintenance: occupancy.maintenance, occupancyPercent: occupancy.occupancyPercent },
      // Current tenants only: people who have moved out are listed separately below, so they never push current dues off the list.
      pendingPayments: outstanding.items.filter((i) => i.tenantStatus === 'ACTIVE').slice(0, 5),
      pendingCount: outstanding.items.filter((i) => i.tenantStatus === 'ACTIVE').length,
      /** People who have moved out but still owe money, largest first. */
      formerTenantDues: outstanding.items.filter((i) => i.tenantStatus !== 'ACTIVE').slice(0, 5),
      kpis: {
        composition: collection.composition,
        trend: collection.trend,
        dues: { total: outstanding.total, ...outstanding.stats },
        rentRoll: extras.rentRoll,
        vacancy: { rooms: occupancy.vacant, lostRent: occupancy.vacantRentPotential, rentableOccupancyPercent: occupancy.rentableOccupancyPercent },
        last7Days: extras.last7Days,
        toBill: extras.toBill,
      },
      recentPayments: extras.recentPayments,
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
