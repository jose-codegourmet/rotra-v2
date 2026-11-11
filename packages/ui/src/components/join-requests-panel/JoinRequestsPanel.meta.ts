import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestsPanelMeta = {
  name: 'JoinRequestsPanel',
  description:
    'Requests panel with Join and Match tabs, drop-out notices, join requests and match requests.',
  usage: [
    'Pass requestDetails for ROTRA player hints and phone-match actions, and dropOuts and matchRequests with callbacks. Counts are derived from those lists.',
    'Use variant sheet inside a Sheet titled Requests with a Done footer; card variant supplies the heading and introduction.',
    'The caller owns all mutations, linking and request lifecycle. The panel checks that a level is selected before confirming.',
    'Each row names the player\'s choice (D-2026-11-11-02): "Asks for a slot", "Asks to be waitlisted" or, with requestDetails.waitlistPosition, "Waitlist #N · asks for a slot". The primary button follows it: Confirm to waitlist for a waitlist request (and whenever slotsFull before start), Give slot (prepared) / Admit player (live) for a request from the waitlist, otherwise Confirm guest / Confirm. The caller\'s confirm refuses a Give slot that would overfill before start.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Q-PREPARE › requestsPanel() (#join-requests, .req-row) and Q-CONSOLE › SHEETS.requests',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  variants: ['card', 'sheet', 'prepared-full', 'active-full', 'placements'],
  related: ['SessionLinkCard', 'LevelSelect', 'Chip', 'Avatar', 'Sheet'],
} satisfies ComponentMeta
