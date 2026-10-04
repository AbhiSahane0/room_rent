import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONTENT_WIDTH } from '@/hooks/useLayout';
import { colors } from '@/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom space so content clears a floating action button. */
  bottomInset?: number;
  edges?: ('top' | 'bottom')[];
  padded?: boolean;
  footer?: ReactNode;
  /** Dashboards and reports use the wide content column on laptops; forms and details stay narrow and readable. */
  wide?: boolean;
}

export function Screen({ children, scroll = true, refreshing, onRefresh, bottomInset = 24, edges = ['top'], padded = true, footer, wide }: Props) {
  const max = wide ? CONTENT_WIDTH.wide : CONTENT_WIDTH.narrow;
  const column = { width: '100%', maxWidth: max, alignSelf: 'center' } as const;
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: padded ? 16 : 0, paddingBottom: bottomInset, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary.DEFAULT} colors={[colors.primary.DEFAULT]} /> : undefined}
          >
            <View style={[column, { flexGrow: 1 }]}>{children}</View>
          </ScrollView>
        ) : (
          <View className={padded ? 'flex-1 px-4' : 'flex-1'}><View style={[column, { flex: 1 }]}>{children}</View></View>
        )}
        {footer ? <View style={column}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
