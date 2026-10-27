import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThemeProvider, useTheme } from './ThemeProvider'

function CurrentTheme() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-4 text-fg shadow-card">
      <p>
        Current theme: <b className="text-accent">{theme}</b>
      </p>
      <p className="text-[13px] text-fg2">
        Follows the Theme toolbar. The button below writes to localStorage under storybook-theme.
      </p>
      <button
        type="button"
        onClick={toggleTheme}
        className="min-h-11 rounded-lg border border-border-strong bg-surface px-4 font-semibold hover:bg-elev"
      >
        Toggle theme
      </button>
    </div>
  )
}

const meta = {
  title: 'Shared/ThemeProvider',
  component: ThemeProvider,
  args: { storageKey: 'storybook-theme', children: <CurrentTheme /> },
} satisfies Meta<typeof ThemeProvider>

export default meta

export const Default: StoryObj<typeof meta> = {}
