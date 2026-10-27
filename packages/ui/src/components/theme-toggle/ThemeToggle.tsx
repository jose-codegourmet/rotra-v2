'use client'

import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { useTheme } from '@rotra/ui/theme-provider'

export type ThemeToggleProps = {
  className?: string
}

/**
 * The top bar's light/dark control: shows a sun in dark mode (switch to light) and a moon in light
 * mode. Matches the prototypes' `.btn.xs.ghost.icon-btn.theme-btn`.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <IconButton
      variant="ghost"
      size="xs"
      onClick={toggleTheme}
      label={`Switch to ${next} mode`}
      title={`${next === 'light' ? 'Light' : 'Dark'} mode`}
      className={className}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </IconButton>
  )
}
