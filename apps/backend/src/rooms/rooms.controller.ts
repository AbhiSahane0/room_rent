import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { CreateRoomDto, ListRoomsQuery, UpdateRoomDto } from './rooms.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListRoomsQuery) {
    return this.service.list(u.userId, q);
  }

  @Post()
  @ResponseMessage('Room created successfully')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateRoomDto) {
    return this.service.create(u.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.userId, id);
  }

  @Get(':id/history')
  history(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.history(u.userId, id);
  }

  @Put(':id')
  @ResponseMessage('Room updated successfully')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(u.userId, id, dto);
  }
}
