import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({ imports: [AssignmentsModule], controllers: [TenantsController], providers: [TenantsService], exports: [TenantsService] })
export class TenantsModule {}
