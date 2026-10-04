import { useEffect, useState } from 'react';
import { Animated, DimensionValue, View } from 'react-native';
import { cn } from '@/utils/cn';

export function Skeleton({ width = '100%', height = 16, radius = 8, className }: { width?: DimensionValue; height?: number; radius?: number; className?: string }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View className={cn('bg-line', className)} style={{ width, height, borderRadius: radius, opacity }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View className="gap-3 rounded-lg border border-line bg-surface p-4">
      <Skeleton width="45%" height={18} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} width={i % 2 ? '60%' : '80%'} height={14} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 4, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <View className="gap-3" accessibilityLabel="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}
