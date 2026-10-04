import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsUUID } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { ExcelExportService } from './excel-export.service';

class ExportQuery {
  @IsOptional() @IsUUID() propertyId?: string;
}

@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExcelExportService) {}

  /** All data of the signed-in owner (or one property) as an Excel workbook. */
  @Get('excel')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async excel(@CurrentUser() u: AuthUser, @Query() q: ExportQuery) {
    const { buffer, fileName } = await this.service.build(u.userId, q.propertyId);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }
}
