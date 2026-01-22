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
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surfaceMuted: 'rgb(var(--color-surface-muted) / <alpha-value>)',
        surface2: 'rgb(var(--color-surface-2) / <alpha-value>)',
        surface3: 'rgb(var(--color-surface-3) / <alpha-value>)',
        appBg: 'var(--bg-base)',
        surfaceUi: 'var(--surface-1)',
        sheet: 'var(--sheet)',
        borderUi: 'var(--border)',
        textPrimary: 'var(--text-1)',
        textSecondary: 'var(--text-2)',
        textTertiary: 'var(--text-3)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        borderSubtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
        ink: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        primaryStrong: 'rgb(var(--color-primary-strong) / <alpha-value>)',
        primarySoft: 'rgb(var(--color-primary-soft) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        accentStrong: 'var(--accent-strong)',
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
