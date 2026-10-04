import React from 'react';
import { View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { Button, Icon, Text } from '@/components/ui';

/** Last line of defence: an unexpected render error shows a friendly screen instead of a blank app. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Deliberately no logging of component trees or data: they can contain tenant details.
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-danger-soft"><Icon icon={TriangleAlert} size={32} tone="danger" /></View>
        <Text variant="heading" className="text-center">Something went wrong</Text>
        <Text tone="soft" className="mb-6 mt-1.5 text-center">Please try again. Your data is safe.</Text>
        <Button label="Try again" fullWidth={false} className="px-8" onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}
