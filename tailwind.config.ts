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
        border: 'rgb(var(--color-border) / <alpha-value>)',
        borderSubtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
        ink: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        primaryStrong: 'rgb(var(--color-primary-strong) / <alpha-value>)',
        primarySoft: 'rgb(var(--color-primary-soft) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)'
      },
      boxShadow: {
        soft: '0 20px 60px -35px rgba(15, 23, 42, 0.35)'
      },
      fontFamily: {
        sans: ['var(--font-space)', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
};

export default config;
