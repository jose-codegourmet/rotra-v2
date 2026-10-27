import type { ComponentMeta } from '@rotra/ui/meta'

export const progressBarMeta = {
  name: 'ProgressBar',
  description:
    'A rounded bar that fills to show known progress, such as games played against the session minimum or time left on a license.',
  usage: [
    'Always pass aria-label with the numbers in words, and show the numbers as text nearby too.',
    'size="sm" (6 px) in Queue player cards; size="md" (8 px) elsewhere. tone="warn" when it needs attention.',
    'Not for unknown waits; use Spinner or Skeleton.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Live console › player cards (.prog); rotra-admin.html › license (.prog)',
  },
  variants: ['accent', 'warn', 'sm', 'md'],
  related: ['Skeleton'],
} satisfies ComponentMeta
