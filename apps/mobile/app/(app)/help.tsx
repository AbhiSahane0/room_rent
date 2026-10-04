import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Header, Icon, Screen, Text } from '@/components/ui';

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I add a tenant?', a: 'Open the Tenants tab and tap the + button. Fill in the details step by step, optionally capture Aadhaar and PAN, choose a vacant room and set the rent and deposit.' },
  { q: 'How do I generate a monthly bill?', a: 'Open a room or tenant and tap Generate Bill. Pick the month, enter the current meter reading, add any other charges and tap Generate Bill. The totals are calculated and checked by the server.' },
  { q: 'What happens to unpaid amounts?', a: 'An unpaid balance is added to the tenant’s next bill as Previous balance, so the latest bill always shows everything the tenant owes. Earlier bills are never changed.' },
  { q: 'How do I record a partial payment?', a: 'Open the bill and tap Record Payment. Enter the amount received, the date and how it was paid. The bill shows the remaining balance until it is fully paid.' },
  { q: 'How do I send a bill to a tenant?', a: 'Open the bill and tap Share. Choose WhatsApp, Email or any other app on your phone to send the PDF invoice.' },
  { q: 'I entered something wrong on a bill.', a: 'Bills that have no payments can be cancelled from the bill screen and generated again. Bills with payments cannot be changed, which keeps your records trustworthy.' },
  { q: 'Where are tenant documents stored?', a: 'Documents are stored in private, encrypted cloud storage. They are only shown after you sign in, using links that expire within a few minutes.' },
  { q: 'What if a tenant moves out?', a: 'Open the tenant and tap Move Out. The room becomes vacant and all bills, payments and documents stay available in the tenant’s history.' },
];

export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Help" subtitle="Quick answers to common questions" />
      <View className="gap-3 pt-2">
        {FAQ.map((item, i) => (
          <Card key={item.q} padded={false}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} className="min-h-14 flex-row items-center justify-between px-4 py-3">
              <Text variant="bodyMedium" className="flex-1 pr-3">{item.q}</Text>
              <Icon icon={open === i ? ChevronUp : ChevronDown} tone="muted" />
            </Pressable>
            {open === i ? <Text tone="soft" className="px-4 pb-4">{item.a}</Text> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
