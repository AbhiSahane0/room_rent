import { Contact, CreditCard, FileSignature, Paperclip } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { DocumentType } from '@/types/api';

export const DOC_META: Record<DocumentType, { label: string; short: string; icon: LucideIcon }> = {
  AADHAAR: { label: 'Aadhaar Card', short: 'aadhaar', icon: Contact },
  PAN: { label: 'PAN Card', short: 'pan', icon: CreditCard },
  RENTAL_AGREEMENT: { label: 'Rental Agreement', short: 'agreement', icon: FileSignature },
  OTHER: { label: 'Other Document', short: 'document', icon: Paperclip },
};
export const DOC_ORDER: DocumentType[] = ['AADHAAR', 'PAN', 'RENTAL_AGREEMENT', 'OTHER'];
