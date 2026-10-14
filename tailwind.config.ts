import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

// One neutral scale for the whole product. `gray`, `stone` and `neutral` all
// resolve to it so legacy class names stay visually consistent.
const neutral = {
  50: '#f8f8f7',
  100: '#f1f1ef',
  200: '#e5e5e2',
  300: '#d4d4cf',
  400: '#a3a39d',
  500: '#76766f',
  600: '#5b5b55',
  700: '#43433f',
  800: '#2c2c29',
  900: '#1c1c1a',
  950: '#121211',
}

// Pongs brand green, desaturated for long working sessions.
const brand = {
  50: '#eff7f3',
  100: '#d8ede3',
  200: '#b1dac8',
  300: '#7fbfa3',
  400: '#4ea07f',
  500: '#2d8565',
  600: '#1f6d52',
  700: '#195843',
  800: '#164737',
  900: '#123a2e',
}

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        gray: neutral,
        stone: neutral,
        slate: neutral,
        neutral,
        brand,
        // Legacy accents fold into the system: emerald/green become the brand
        // green, rose becomes the single danger red.
        emerald: brand,
        green: brand,
        rose: colors.red,
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      // Tighter corners: the product should read as a tool, not a landing page.
      borderRadius: {
        lg: '0.5rem',
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.75rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(18 18 17 / 0.04)',
        DEFAULT: '0 1px 2px 0 rgb(18 18 17 / 0.05), 0 1px 3px 0 rgb(18 18 17 / 0.04)',
        md: '0 4px 12px -2px rgb(18 18 17 / 0.08), 0 2px 4px -2px rgb(18 18 17 / 0.04)',
        lg: '0 12px 32px -8px rgb(18 18 17 / 0.14), 0 4px 8px -4px rgb(18 18 17 / 0.06)',
        xl: '0 24px 48px -12px rgb(18 18 17 / 0.20)',
      },
    },
  },
  plugins: [],
}

export default config
