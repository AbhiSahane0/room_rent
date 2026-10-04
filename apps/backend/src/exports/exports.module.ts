import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { ExcelExportService } from './excel-export.service';
import { ExportsController } from './exports.controller';

@Module({ imports: [PropertiesModule], controllers: [ExportsController], providers: [ExcelExportService] })
export class ExportsModule {}
