import type { ComponentMeta } from '@rotra/ui/meta'

export const clubHeaderMeta = {
  name: 'ClubHeader',
  description:
    'The top of the club dashboard: club logo or initials, the dated "Club dashboard" label, the club name, the License active chip with license and founding lines, and the primary Create session button.',
  usage: [
    'Use once at the top of Q-HOME. The license gate (AccessGate) replaces the whole page, so this header never shows "License expired".',
    'Create session is full width on phones (≤ 640 px).',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-HOME › viewHome() › .club-head',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['NowCard', 'SessionCalendar', 'Avatar', 'Chip'],
} satisfies ComponentMeta
