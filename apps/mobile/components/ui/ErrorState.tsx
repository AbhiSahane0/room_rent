import { CloudOff, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { ApiError, NetworkError } from '@/api/client';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const offline = error instanceof NetworkError;
  const message =
    offline
      ? 'Please check your internet connection and try again.'
      : error instanceof ApiError && error.status < 500 && error.status !== 401
        ? error.message
        : 'Please try again in a moment.';
  return (
    <View className="items-center px-6 py-12">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-danger-soft">
        <Icon icon={offline ? CloudOff : TriangleAlert} size={32} tone="danger" />
      </View>
      <Text variant="heading" className="text-center">{offline ? 'You appear to be offline' : 'Something went wrong'}</Text>
      <Text tone="soft" className="mt-1.5 mb-6 text-center">{message}</Text>
      {onRetry ? <Button label="Retry" variant="secondary" onPress={onRetry} fullWidth={false} className="px-8" /> : null}
    </View>
  );
}
