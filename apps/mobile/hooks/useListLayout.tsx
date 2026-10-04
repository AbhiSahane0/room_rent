import { ReactElement } from 'react';
import { DimensionValue, View } from 'react-native';
import { CONTENT_WIDTH, useLayout } from './useLayout';

/** Shared FlatList setup: single column on phones, a card grid on wide browsers, always a centred column. */
export function useListLayout(bottomPadding = 96, gap = 12) {
  const { columns } = useLayout();
  const pct = `${100 / columns}%` as DimensionValue;
  return {
    listProps: {
      numColumns: columns,
      key: `cols-${columns}`,
      ...(columns > 1 ? { columnWrapperStyle: { gap } } : {}),
      contentContainerStyle: { paddingHorizontal: 16, paddingBottom: bottomPadding, gap, flexGrow: 1, width: '100%' as const, maxWidth: CONTENT_WIDTH.wide, alignSelf: 'center' as const },
    },
    cell: (element: ReactElement) => <View style={{ flex: 1, maxWidth: columns > 1 ? pct : undefined }}>{element}</View>,
  };
}
