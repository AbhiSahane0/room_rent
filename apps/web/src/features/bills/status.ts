import type { BadgeTone } from '@/components/ui';
import type { BillStatus } from '@rental/shared';

export const BILL_STATUS: Record<BillStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  GENERATED: { label: 'Unpaid', tone: 'warning' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'primary' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};
