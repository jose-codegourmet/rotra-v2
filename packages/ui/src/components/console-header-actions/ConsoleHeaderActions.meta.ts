import type { ComponentMeta } from '@rotra/ui/meta'

export const consoleHeaderActionsMeta = {
  name: 'ConsoleHeaderActions',
  description:
    'The live console header\'s control cluster at the upper right: "Match requests" (wide screens: a 40 px raised-hand button with the waiting count as a badge on its corner, hidden at 0; phones: a full-width button with the icon, the words and the count in a pill; warn-coloured and bold while any match request is waiting) and "Share" (opens the Share dialog). No ⋯ menu, no Courts and time, no Payments (D-2026-11-26-05).',
  usage: [
    'Pass it as PageHeader actions on the live console only; on phones the cluster takes the full row under the title and starts at the left.',
    'matchRequestCount is open match requests only: join requests close at Start, so none are counted after it.',
    'The button label is "Match requests · N" (+ " waiting" while N > 0); the count badge and pill disappear at 0.',
    'Do not use on the preparation page: its header keeps its own actions and the Cancel / Delete More menu.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE header (viewConsole › .live-acts: req-btn and openShare)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-11-queue-match-requests-live-only.md',
    'docs/mockup-changes/2026-11-26-queue-console-no-courts-and-time.md',
  ],
  related: ['PageHeader', 'JoinRequestsPanel', 'ShareSessionDialog'],
} satisfies ComponentMeta
