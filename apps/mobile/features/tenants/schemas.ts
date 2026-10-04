import { z } from 'zod';
import { optionalMoneyString, orUndefined, toNumber, toOptionalNumber } from '@/utils/validation';

const phone = z.string().trim().refine((v) => /^\+?[0-9]{10,15}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid phone number');
const optionalPhone = z.string().trim().refine((v) => v === '' || /^\+?[0-9]{10,15}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid phone number');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date');

export const tenantFormSchema = z.object({
  // Personal
  fullName: z.string().trim().min(2, 'Enter the full name').max(120),
  joiningDate: isoDate,
  occupation: z.string().trim().max(120),
  notes: z.string().trim().max(1000),
  // Contact
  phone,
  alternatePhone: optionalPhone,
  email: z.string().trim().refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address'),
  permanentAddress: z.string().trim().max(300),
  currentAddress: z.string().trim().max(300),
  emergencyContact: z.string().trim().max(120),
  emergencyPhone: optionalPhone,
  // Room & rent
  roomId: z.string(),
  startDate: z.string(),
  agreedRent: z.string().trim(),
  securityDeposit: optionalMoneyString,
  electricityMode: z.enum(['METER', 'FIXED', 'NONE']),
  ratePerUnit: optionalMoneyString,
  fixedElectricity: optionalMoneyString,
  initialMeterReading: optionalMoneyString,
});
export type TenantForm = z.infer<typeof tenantFormSchema>;

export const emptyTenantForm: TenantForm = {
  fullName: '', joiningDate: '', occupation: '', notes: '', phone: '', alternatePhone: '', email: '', permanentAddress: '', currentAddress: '',
  emergencyContact: '', emergencyPhone: '', roomId: '', startDate: '', agreedRent: '', securityDeposit: '', electricityMode: 'METER',
  ratePerUnit: '', fixedElectricity: '', initialMeterReading: '',
};

export const STEP_FIELDS: Record<string, (keyof TenantForm)[]> = {
  Personal: ['fullName', 'joiningDate', 'occupation', 'notes'],
  Contact: ['phone', 'alternatePhone', 'email', 'permanentAddress', 'currentAddress', 'emergencyContact', 'emergencyPhone'],
  Documents: [],
  Room: ['roomId'],
  'Rent & Deposit': ['startDate', 'agreedRent', 'securityDeposit', 'electricityMode', 'ratePerUnit', 'fixedElectricity', 'initialMeterReading'],
  Review: [],
};

const strip = (p?: string) => (p ? p.replace(/[\s-]/g, '') : undefined);

export function tenantPayload(v: TenantForm, propertyId?: string) {
  return {
    fullName: v.fullName, phone: strip(v.phone), alternatePhone: strip(orUndefined(v.alternatePhone)), email: orUndefined(v.email),
    permanentAddress: orUndefined(v.permanentAddress), currentAddress: orUndefined(v.currentAddress), emergencyContact: orUndefined(v.emergencyContact),
    emergencyPhone: strip(orUndefined(v.emergencyPhone)), occupation: orUndefined(v.occupation), joiningDate: v.joiningDate, notes: orUndefined(v.notes),
    ...(propertyId ? { propertyId } : {}),
  };
}

export const assignmentPayload = (v: TenantForm) => ({
  roomId: v.roomId, startDate: v.startDate || v.joiningDate, agreedRent: toNumber(v.agreedRent), securityDeposit: toOptionalNumber(v.securityDeposit) ?? 0,
  electricityMode: v.electricityMode,
  ratePerUnit: v.electricityMode === 'METER' ? toOptionalNumber(v.ratePerUnit) : undefined,
  fixedElectricity: v.electricityMode === 'FIXED' ? toOptionalNumber(v.fixedElectricity) : undefined,
  initialMeterReading: v.electricityMode === 'METER' ? toOptionalNumber(v.initialMeterReading) : undefined,
});
