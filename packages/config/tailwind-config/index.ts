import type { Config } from 'tailwindcss'

const config: Omit<Config, 'content'> = {
  darkMode: 'class',
  theme: {
    screens: {
      sm:    '640px',
      md:    '768px',
      lg:    '1024px',
      xl:    '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Background scale — values defined per-theme in globals.css
        'bg-base':     'var(--color-bg-base)',
        'bg-surface':  'var(--color-bg-surface)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'bg-overlay':  'var(--color-bg-overlay)',

        // Text scale
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-disabled':  'var(--color-text-disabled)',

        // Accent
        accent:          'var(--color-accent)',
        'accent-dim':    'var(--color-accent-dim)',
        'accent-subtle': 'var(--color-accent-subtle)',

        // Semantic
        error:          'var(--color-error)',
        warning:        'var(--color-warning)',
        border:         'var(--color-border)',
        'border-strong':'var(--color-border-strong)',
      },

      fontFamily: {
        sans: ['var(--font-satoshi)', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        display: ['28px', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '700' }],
        title: ['22px', { lineHeight: '1.3', letterSpacing: '-0.3px', fontWeight: '600' }],
        heading: ['18px', { lineHeight: '1.4', letterSpacing: '-0.2px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.5', letterSpacing: '0px', fontWeight: '400' }],
        small: ['13px', { lineHeight: '1.4', letterSpacing: '0.1px', fontWeight: '400' }],
        label: ['12px', { lineHeight: '1.2', letterSpacing: '0.5px', fontWeight: '500' }],
        micro: ['10px', { lineHeight: '1.2', letterSpacing: '0.8px', fontWeight: '500' }],
      },

      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
      },

      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        full: '9999px',
      },

      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.4)',
        modal: '0 8px 32px rgba(0,0,0,0.6)',
        accent: '0 0 16px rgba(0,255,136,0.25)',
      },

      transitionDuration: {
        fast: '100ms',
        default: '200ms',
        slow: '350ms',
        spring: '400ms',
      },
    },
  },
}

export default config
