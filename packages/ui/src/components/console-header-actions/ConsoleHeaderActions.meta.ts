import type { ComponentMeta } from '@rotra/ui/meta'

export const consoleHeaderActionsMeta = {
  name: 'ConsoleHeaderActions',
  description:
    'The live console header\'s compact control cluster at the upper right: "Match requests · N" (always shown; warn-coloured and bold while any match request is waiting), "Courts and time", "Payments" and a ⋯ "More for this session" menu with Public page, Copy Facebook post, Session settings and Home.',
  usage: [
    'Pass it as PageHeader actions on the live console only; on narrow screens it wraps under the title.',
    'matchRequestCount is open match requests only: join requests close at Start, so none are counted after it.',
    "The More menu is OverflowMenu (same pattern as the preparation page's More menu): opening focuses the first item; Escape or a tap outside closes it and returns focus to the ⋯ button.",
    'Do not use on the preparation page: its header keeps its own actions and the Cancel / Delete More menu.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE header (viewConsole › .live-acts, live-more menu)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-11-queue-match-requests-live-only.md',
  ],
  related: ['PageHeader', 'OverflowMenu', 'JoinRequestsPanel', 'CourtsAndTimeSheet'],
} satisfies ComponentMeta
