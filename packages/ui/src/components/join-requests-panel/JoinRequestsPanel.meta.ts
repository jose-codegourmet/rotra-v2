import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestsPanelMeta = {
  name: 'JoinRequestsPanel',
  description:
    'The join requests guests sent from the session link, oldest first: initials, name and nickname, phone (or "No phone given"), stated band and time, a Guest request chip, a level select preset to the middle of the stated band, and Decline / Confirm guest (Confirm to waitlist when slots are full).',
  usage: [
    'Use the card variant on Preparation above the tabs while requests are waiting, next to SessionLinkCard.',
    'Use the sheet variant inside the live console\'s "Join requests" Sheet: no card chrome and no heading, since the sheet title names it.',
    'Confirming with no level shows "Choose a level for this club before confirming." and does not call onConfirm. The container owns the confirm/decline mutations and their toasts.',
    "A request's phone shows only here, for the Queue Master; never put this panel or its rows on a public screen.",
    'Pass loading while the roster query runs (the live console sheet): Skeleton rows, never fake names.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'Q-PREPARE › requestsPanel() (#join-requests, .req-row) and Q-CONSOLE › SHEETS.requests',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  variants: ['card', 'sheet'],
  related: ['SessionLinkCard', 'LevelSelect', 'Chip', 'Avatar', 'Sheet'],
} satisfies ComponentMeta
