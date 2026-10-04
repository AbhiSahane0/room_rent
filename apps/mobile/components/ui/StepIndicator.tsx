import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import { Text } from './Text';

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View className="pb-2 pt-1">
      <View className="flex-row items-center">
        {steps.map((_, i) => (
          <View key={i} className="flex-1 flex-row items-center">
            <View className={cn('h-6 w-6 items-center justify-center rounded-full border-2', i <= current ? 'border-primary bg-primary' : 'border-line-strong bg-surface')}>
              {i < current ? <Icon icon={Check} size={13} tone="white" /> : <View className={cn('h-2 w-2 rounded-full', i === current ? 'bg-white' : 'bg-transparent')} />}
            </View>
            {i < steps.length - 1 ? <View className={cn('mx-1 h-0.5 flex-1', i < current ? 'bg-primary' : 'bg-line-strong')} /> : null}
          </View>
        ))}
      </View>
      <Text variant="secondaryMedium" tone="primary" className="mt-2">Step {current + 1} of {steps.length} · {steps[current]}</Text>
    </View>
  );
}
