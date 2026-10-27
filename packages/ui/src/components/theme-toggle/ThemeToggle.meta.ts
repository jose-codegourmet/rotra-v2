import type { ComponentMeta } from '@rotra/ui/meta'

export const themeToggleMeta = {
  name: 'ThemeToggle',
  description:
    'The top bar\'s light and dark switch: a sun in dark mode, a moon in light mode, labelled "Switch to light mode" or "Switch to dark mode".',
  usage: [
    "Use once in each app's top bar, inside a ThemeProvider.",
    'To toast "Light mode" / "Dark mode" as the prototypes do, pass onThemeChange to ThemeProvider.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Top bar › light/dark button (.theme-btn)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  related: ['ThemeProvider', 'TopBar'],
} satisfies ComponentMeta
