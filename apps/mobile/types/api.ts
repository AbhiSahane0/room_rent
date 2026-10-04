import type { BillStatus, ChargeType, DocumentType, ElectricityMode, PaymentMethod, RoomStatus, TenantStatus } from '@rental/shared';

export type { BillStatus, ChargeType, DocumentType, ElectricityMode, PaymentMethod, RoomStatus, TenantStatus };
export type { Paginated } from '@rental/shared';

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string | null;
  billPrefix: string;
  dueDayOfMonth: number;
  defaultRatePerUnit: number;
  billFooterNote: string | null;
  roomCount?: number;
  occupiedCount?: number;
}

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  defaultRent: number;
  electricityMode: ElectricityMode;
  ratePerUnit: number | null;
  fixedElectricity: number | null;
  notes: string | null;
  monthlyRent: number;
  balance: number;
  currentTenant: { id: string; fullName: string; phone: string; assignmentId: string } | null;
}

export interface RoomDetail extends Omit<Room, 'currentTenant'> {
  property: { id: string; name: string };
  currentTenant: { id: string; fullName: string; phone: string; assignmentId: string; startDate: string; securityDeposit: number } | null;
  previousTenants: { assignmentId: string; tenantId: string; fullName: string; startDate: string; endDate: string | null; agreedRent: number }[];
}
