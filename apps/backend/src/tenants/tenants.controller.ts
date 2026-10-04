import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AssignmentsService } from '../assignments/assignments.service';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { CreateTenantDto, ListTenantsQuery, UpdateTenantDto } from './tenants.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService, private readonly assignments: AssignmentsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListTenantsQuery) {
    return this.service.list(u.userId, q);
  }

  @Post()
  @ResponseMessage('Tenant created successfully')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTenantDto) {
    return this.service.create(u.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.userId, id);
  }

  @Put(':id')
  @ResponseMessage('Tenant updated successfully')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(u.userId, id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Tenant removed')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.userId, id);
  }

  @Get(':id/assignments')
  assignmentsFor(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.listForTenant(u.userId, id);
  }
}
