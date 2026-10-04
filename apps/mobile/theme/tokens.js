/**
 * Single source of truth for the design system.
 * Consumed by tailwind.config.js (class names) and theme/index.ts (imperative use, e.g. icon colours).
 */
module.exports = {
  colors: {
    primary: { DEFAULT: '#0F766E', dark: '#0B5C56', soft: '#E6F4F2', fg: '#FFFFFF' },
    secondary: { DEFAULT: '#334155', soft: '#EEF1F5' },
    bg: '#F6F7F9',
    surface: { DEFAULT: '#FFFFFF', muted: '#F1F3F6' },
    ink: { DEFAULT: '#0F172A', soft: '#475569', muted: '#94A3B8' },
    line: { DEFAULT: '#E4E8EE', strong: '#CBD3DD' },
    success: { DEFAULT: '#15803D', soft: '#E7F5EC' },
    warning: { DEFAULT: '#B45309', soft: '#FDF1E1' },
    danger: { DEFAULT: '#B91C1C', soft: '#FCEAEA' },
    disabled: { DEFAULT: '#CBD3DD', fg: '#94A3B8' },
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  icon: { sm: 16, md: 20, lg: 24, stroke: 1.75 },
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
};
