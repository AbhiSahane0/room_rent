import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Card, Icon } from '@/components/ui';
import { Page } from '@/components/layout/Page';

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I add a tenant?', a: 'Open Tenants and choose Add Tenant. Fill in the details step by step, optionally add Aadhaar and PAN, choose a vacant room and set the rent and deposit.' },
  { q: 'How do I generate a monthly bill?', a: 'Open a room or tenant and choose Generate Bill. Pick the month, enter the current meter reading, add any other charges and generate it. The totals are calculated and checked by the server.' },
  { q: 'What happens to unpaid amounts?', a: 'An unpaid balance is added to the tenant’s next bill as Outstanding, so the latest bill always shows everything the tenant owes. Earlier bills are never changed.' },
  { q: 'How do I record a partial payment?', a: 'Open the bill and choose Record Payment. Enter the amount received, the date and how it was paid. The bill shows the remaining balance until it is fully paid.' },
  { q: 'How do I send a bill to a tenant?', a: 'Open the bill and choose Share. On a phone you can pick WhatsApp, Email or any app; on a laptop the PDF is downloaded so you can attach it.' },
  { q: 'I entered something wrong on a bill.', a: 'Bills with no payments can be cancelled from the bill page and generated again. Bills with payments cannot be changed, which keeps your records trustworthy.' },
  { q: 'Where are tenant documents stored?', a: 'In private, encrypted cloud storage. They are only shown after you sign in, using links that expire within a few minutes.' },
  { q: 'What if a tenant moves out?', a: 'Open the tenant and choose Move Out. The room becomes vacant and all bills, payments and documents stay in the tenant’s history.' },
  { q: 'How do I install this on my phone?', a: 'iPhone: open the site in Safari, tap Share, then Add to Home Screen. Android: use the browser menu, then Install app.' },
];

export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Page title="Help" subtitle="Quick answers to common questions" back>
      <div className="space-y-3">
        {FAQ.map((item, i) => (
          <Card key={item.q} padded={false}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex min-h-14 w-full items-center justify-between px-4 py-3 text-left">
              <span className="pr-3 font-medium">{item.q}</span><Icon icon={open === i ? ChevronUp : ChevronDown} tone="muted" />
            </button>
            {open === i ? <p className="px-4 pb-4 text-ink-soft">{item.a}</p> : null}
          </Card>
        ))}
      </div>
    </Page>
  );
}
