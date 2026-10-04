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

export interface TenantListItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: TenantStatus;
  joiningDate: string;
  room: { id: string; roomNumber: string } | null;
  assignmentId: string | null;
  monthlyRent: number | null;
  balance: number;
}

export interface RentHistoryEntry { id: string; amount: number; effectiveFrom: string }

export interface TenantDetail {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  occupation: string | null;
  joiningDate: string;
  notes: string | null;
  status: TenantStatus;
  property: { id: string; name: string };
  outstanding: number;
  documentTypes: DocumentType[];
  currentAssignment: {
    id: string;
    room: { id: string; roomNumber: string };
    startDate: string;
    agreedRent: number;
    securityDeposit: number;
    electricityMode: ElectricityMode;
    ratePerUnit: number | null;
    fixedElectricity: number | null;
    initialMeterReading: number | null;
    rents: RentHistoryEntry[];
  } | null;
  lastAssignment: { id: string; room: { id: string; roomNumber: string }; startDate: string; endDate: string | null; agreedRent: number; securityDeposit: number } | null;
  roomHistory: {
    assignmentId: string;
    room: { id: string; roomNumber: string };
    startDate: string;
    endDate: string | null;
    agreedRent: number;
    securityDeposit: number;
    status: 'ACTIVE' | 'CLOSED';
    finalMeterReading: number | null;
    moveOutNotes: string | null;
  }[];
}

export interface TenantDocumentItem {
  id: string;
  tenantId: string;
  type: DocumentType;
  label: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
