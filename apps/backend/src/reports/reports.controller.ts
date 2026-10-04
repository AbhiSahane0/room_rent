import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { ReportQuery } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('collection')
  collection(@CurrentUser() u: AuthUser, @Query() q: ReportQuery) {
    return this.service.collection(u.userId, q);
  }

  @Get('outstanding')
  outstanding(@CurrentUser() u: AuthUser, @Query() q: ReportQuery) {
    return this.service.outstanding(u.userId, q);
  }

  @Get('occupancy')
  occupancy(@CurrentUser() u: AuthUser, @Query() q: ReportQuery) {
    return this.service.occupancy(u.userId, q);
  }
}
