import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { CancelBillDto, CreateBillDto, ListBillsQuery, PreviewBillDto, RecurringChargeDto } from './bills.dto';
import { BillsService } from './bills.service';

@Controller()
export class BillsController {
  constructor(private readonly service: BillsService) {}

  @Get('bills')
  list(@CurrentUser() u: AuthUser, @Query() q: ListBillsQuery) {
    return this.service.list(u.userId, q);
  }

  /** Server-side calculation for the Generate Bill screen. Nothing is saved. */
  @Post('bills/preview')
  @HttpCode(200)
  preview(@CurrentUser() u: AuthUser, @Body() dto: PreviewBillDto) {
    return this.service.preview(u.userId, dto);
  }

  @Post('bills')
  @ResponseMessage('Bill generated successfully')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateBillDto) {
    return this.service.create(u.userId, dto);
  }

  @Get('bills/:id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.userId, id);
  }

  @Post('bills/:id/cancel')
  @HttpCode(200)
  @ResponseMessage('Bill cancelled')
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelBillDto) {
    return this.service.cancel(u.userId, id, dto.reason);
  }

  @Get('room-assignments/:id/charges')
  charges(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.listCharges(u.userId, id);
  }

  @Post('room-assignments/:id/charges')
  @ResponseMessage('Recurring charge added')
  addCharge(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RecurringChargeDto) {
    return this.service.addCharge(u.userId, id, dto);
  }

  @Delete('room-assignments/:id/charges/:chargeId')
  @ResponseMessage('Recurring charge removed')
  removeCharge(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('chargeId', ParseUUIDPipe) chargeId: string) {
    return this.service.removeCharge(u.userId, id, chargeId);
  }
}
