import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { ChangeRentDto, CreateAssignmentDto, MoveOutDto } from './assignments.dto';
import { AssignmentsService } from './assignments.service';

@Controller('room-assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Post()
  @ResponseMessage('Tenant assigned to room')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateAssignmentDto) {
    return this.service.create(u.userId, dto);
  }

  @Post(':id/move-out')
  @HttpCode(200)
  @ResponseMessage('Tenant moved out. The room is now vacant.')
  moveOut(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveOutDto) {
    return this.service.moveOut(u.userId, id, dto);
  }

  @Post(':id/rent')
  @HttpCode(200)
  @ResponseMessage('Rent updated')
  changeRent(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeRentDto) {
    return this.service.changeRent(u.userId, id, dto);
  }

  @Get(':id/rent-history')
  rentHistory(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.rentHistory(u.userId, id);
  }
}
