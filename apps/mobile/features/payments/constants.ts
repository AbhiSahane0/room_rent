import { Banknote, CreditCard, Ellipsis, Landmark, Smartphone } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { PaymentMethod } from '@/types/api';

export const METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'BANK_TRANSFER', label: 'Bank', icon: Landmark },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'OTHER', label: 'Other', icon: Ellipsis },
];
export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CARD: 'Card', OTHER: 'Other' };
