import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ReportQuery {
  @IsOptional() @IsUUID() propertyId?: string;
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Month must look like 2026-09' }) month?: string;
}
