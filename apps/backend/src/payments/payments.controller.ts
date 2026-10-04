import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { ListPaymentsQuery, RecordPaymentDto, RecordTenantPaymentDto } from './payments.dto';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('bills/:id/payments')
  @ResponseMessage('Payment recorded successfully')
  record(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPaymentDto) {
    return this.service.record(u.userId, id, dto);
  }

  @Post('payments')
  @ResponseMessage('Payment recorded successfully')
  recordForTenant(@CurrentUser() u: AuthUser, @Body() dto: RecordTenantPaymentDto) {
    return this.service.recordForTenant(u.userId, dto);
  }

  @Get('payments')
  list(@CurrentUser() u: AuthUser, @Query() q: ListPaymentsQuery) {
    return this.service.list(u.userId, q);
  }

  @Get('tenants/:id/open-bill')
  openBill(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.openBill(u.userId, id);
  }
}
