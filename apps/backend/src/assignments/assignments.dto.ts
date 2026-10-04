import { Type } from 'class-transformer';
import { ElectricityMode } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AssignmentTermsDto {
  @IsUUID() roomId: string;
  @Matches(DATE, { message: 'Start date must be in YYYY-MM-DD format' }) startDate: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) agreedRent: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) securityDeposit?: number;
  @IsOptional() @IsEnum(ElectricityMode) electricityMode?: ElectricityMode;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) ratePerUnit?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) fixedElectricity?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) initialMeterReading?: number;
  /** Amount already owed before this system was used. It is added to the tenant's first bill. */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) openingBalance?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateAssignmentDto extends AssignmentTermsDto {
  @IsUUID() tenantId: string;
}

export class MoveOutDto {
  @Matches(DATE, { message: 'Move-out date must be in YYYY-MM-DD format' }) moveOutDate: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) finalMeterReading?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ChangeRentDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount: number;
  /** Rent applies from the month containing this date. */
  @Matches(DATE, { message: 'Effective date must be in YYYY-MM-DD format' }) effectiveFrom: string;
}

