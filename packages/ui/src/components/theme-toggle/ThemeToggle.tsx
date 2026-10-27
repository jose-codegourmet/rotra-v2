'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
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
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`${next === 'light' ? 'Light' : 'Dark'} mode`}
      className={cn(
        'inline-flex min-h-8 min-w-9 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-[13px] font-semibold',
        'hover:bg-elev touch:min-h-11 touch:min-w-11',
        className,
      )}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
