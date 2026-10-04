import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ElectricityMode, RoomStatus } from '@prisma/client';
import { PaginationQuery } from '../common/pagination';

export class CreateRoomDto {
  @IsUUID() propertyId: string;
  @IsString() @IsNotEmpty() @MaxLength(20) roomNumber: string;
  @IsOptional() @IsString() @MaxLength(40) floor?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) defaultRent: number;
  @IsOptional() @IsEnum(ElectricityMode) electricityMode?: ElectricityMode;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) ratePerUnit?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) fixedElectricity?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateRoomDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(20) roomNumber?: string;
  @IsOptional() @IsString() @MaxLength(40) floor?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) defaultRent?: number;
  /** Only VACANT <-> MAINTENANCE; OCCUPIED is controlled by room assignments. */
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsEnum(ElectricityMode) electricityMode?: ElectricityMode;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) ratePerUnit?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) fixedElectricity?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ListRoomsQuery extends PaginationQuery {
  @IsOptional() @IsUUID() propertyId?: string;
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
}
