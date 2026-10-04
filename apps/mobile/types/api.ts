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

export interface BillListItem {
  id: string;
  billNumber: string;
  billingPeriod: string;
  dueDate: string;
  status: BillStatus;
  totalDue: number;
  paidAmount: number;
  balance: number;
  carriedForwardToId: string | null;
  tenant: { id: string; fullName: string };
  room: { id: string; roomNumber: string };
}

export interface BillItemRow {
  id: string;
  type: 'RENT' | 'ELECTRICITY' | 'CHARGE' | 'LATE_FEE' | 'DISCOUNT' | 'PREVIOUS_BALANCE';
  description: string;
  amount: number;
  meta: Record<string, any> | null;
}

export interface PaymentRow {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
}

export interface BillDetail {
  id: string;
  billNumber: string;
  billingPeriod: string;
  dueDate: string;
  status: BillStatus;
  storedStatus: BillStatus;
  rentAmount: number;
  electricityAmount: number;
  otherChargesAmount: number;
  lateFee: number;
  discount: number;
  previousBalance: number;
  totalDue: number;
  paidAmount: number;
  balance: number;
  notes: string | null;
  items: BillItemRow[];
  payments: PaymentRow[];
  tenant: { id: string; fullName: string; phone: string };
  room: { id: string; roomNumber: string };
  property: { id: string; name: string; address: string; city: string; state: string; pincode: string };
  carriedInto: { id: string; billNumber: string } | null;
  absorbed: { id: string; billNumber: string; billingPeriod: string }[];
}

export interface BillPreview {
  assignmentId: string;
  tenant: { id: string; fullName: string };
  room: { id: string; roomNumber: string };
  billingPeriod: string;
  suggestedPeriod: string;
  dueDate: string;
  rent: number;
  electricity: {
    mode: ElectricityMode;
    previousReading: number | null;
    currentReading: number | null;
    units: number;
    ratePerUnit: number | null;
    calculatedAmount: number;
    amount: number;
    isOverride: boolean;
    needsReading: boolean;
  };
  charges: { type: ChargeType; name: string; amount: number }[];
  totals: { rent: number; electricity: number; otherCharges: number; lateFee: number; discount: number; subtotal: number; previousBalance: number; totalDue: number };
  carriedBills: { id: string; billNumber: string; balance: number }[];
  recurringCharges: { id: string; type: ChargeType; name: string; amount: number }[];
}

export interface PaymentListItem {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  tenant: { id: string; fullName: string };
  bill: { id: string; billNumber: string; billingPeriod: string; room: { roomNumber: string } };
}

export interface OpenBill {
  id: string;
  billNumber: string;
  billingPeriod: string;
  dueDate: string;
  status: BillStatus;
  totalDue: number;
  paidAmount: number;
  balance: number;
  label: string;
}
