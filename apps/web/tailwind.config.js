/** Same design tokens as the mobile app so both feel like one product. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      fontSize: {
        display: ['28px', { lineHeight: '34px', fontWeight: '700' }],
        title: ['22px', { lineHeight: '28px', fontWeight: '700' }],
        heading: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        small: ['13px', { lineHeight: '18px' }],
        caption: ['11.5px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
