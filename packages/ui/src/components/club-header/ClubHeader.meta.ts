import type { ComponentMeta } from '@rotra/ui/meta'

export const clubHeaderMeta = {
  name: 'ClubHeader',
  description:
    'The top of the club dashboard: club logo or initials, the dated "Club dashboard" label, the club name, the License active chip with license and founding lines, the primary Create session button and the secondary Share club invite button.',
  usage: [
    'Use once at the top of Q-HOME. The license gate (AccessGate) replaces the whole page, so this header never shows "License expired".',
    'Create session and Share club invite sit side by side; both are full width on phones (≤ 640 px).',
    'The container opens the Share club invite sheet from onShareClubInvite; the button is hidden when the prop is not passed.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HOME › viewHome() › .club-head',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['NowCard', 'SessionCalendar', 'Avatar', 'Chip'],
} satisfies ComponentMeta
