import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg-base)',
        bg2: 'var(--bg-accent)',
        surface: 'var(--surface)',
        surfaceMuted: 'var(--surface-2)',
        surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)',
        appBg: 'var(--bg-base)',
        surfaceUi: 'var(--surface-2)',
        sheet: 'var(--sheet)',
        borderUi: 'var(--border)',
        text: 'var(--text-1)',
        textPrimary: 'var(--text-1)',
        textSecondary: 'var(--text-2)',
        textTertiary: 'var(--text-3)',
        textInv: 'var(--text-1)',
        border: 'var(--border)',
        borderSubtle: 'var(--border)',
        ink: 'var(--text-1)',
        muted: 'var(--text-2)',
        muted2: 'var(--text-3)',
        primary: 'rgb(var(--accent) / <alpha-value>)',
        primaryStrong: 'rgb(var(--accent) / <alpha-value>)',
        primarySoft: 'rgb(var(--accent) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accentStrong: 'rgb(var(--accent) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)'
      },
      backgroundImage: {
        app: 'linear-gradient(180deg, var(--bg-top), var(--bg-base), var(--bg-bottom))'
      },
      boxShadow: {
        soft: '0 20px 60px -35px rgba(15, 23, 42, 0.35)',
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)'
      },
      fontFamily: {
        sans: ['var(--font-space)', 'ui-sans-serif', 'system-ui']
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      }
    }
  },
  plugins: []
};

export default config;
