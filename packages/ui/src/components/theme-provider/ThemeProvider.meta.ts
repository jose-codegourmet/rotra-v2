import type { ComponentMeta } from '@rotra/ui/meta'

export const themeProviderMeta = {
  name: 'ThemeProvider',
  description:
    "Owns the light and dark theme: sets <html data-theme>, starts dark, and remembers the choice on this device under the app's storage key.",
  usage: [
    "Mount once per app in src/providers, with storageKey rotra-queue-theme, rotra-player-theme or rotra-admin-theme (the prototypes' keys).",
    'No flash of the wrong theme: render getThemeScript(storageKey) from @rotra/ui/theme-provider/script in the root layout <head>, and add suppressHydrationWarning to <html>. No cookie is used.',
    'Read or change the theme with useTheme(); for the top-bar control use ThemeToggle.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Script › THEME_KEY, toggleTheme (same in rotra-player.html and rotra-admin.html)',
  },
  docs: ['docs/architecture.md#6-styling-theming-and-motion'],
  related: ['ThemeToggle'],
} satisfies ComponentMeta
