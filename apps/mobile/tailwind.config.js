const tokens = require('./theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokens.colors,
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
      fontFamily: tokens.fonts,
      fontSize: {
        display: ['28px', { lineHeight: '34px' }],
        title: ['22px', { lineHeight: '28px' }],
        heading: ['17px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        secondary: ['13px', { lineHeight: '18px' }],
        caption: ['11.5px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
