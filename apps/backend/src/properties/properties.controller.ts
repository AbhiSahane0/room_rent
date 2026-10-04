import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.userId);
  }

  @Post()
  @ResponseMessage('Property created successfully')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePropertyDto) {
    return this.service.create(u.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.userId, id);
  }

  @Put(':id')
  @ResponseMessage('Property updated successfully')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePropertyDto) {
    return this.service.update(u.userId, id, dto);
  }
}
