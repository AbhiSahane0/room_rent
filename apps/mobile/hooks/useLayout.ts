import { Platform, useWindowDimensions } from 'react-native';

export const BREAKPOINTS = { desktop: 1024, tablet: 768 } as const;
export const CONTENT_WIDTH = { narrow: 720, wide: 1100 } as const;

/**
 * One place that decides how the UI adapts. Phones (native and mobile browsers) keep the bottom-tab layout;
 * laptops get a sidebar, a centred content column and multi-column card grids.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web';
  const isDesktop = web && width >= BREAKPOINTS.desktop;
  const columns = !web ? 1 : width >= 1280 ? 3 : width >= 820 ? 2 : 1;
  return { width, isWeb: web, isDesktop, columns };
}
