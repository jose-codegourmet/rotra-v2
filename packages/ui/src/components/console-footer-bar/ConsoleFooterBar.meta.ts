import type { ComponentMeta } from '@rotra/ui/meta'

export const consoleFooterBarMeta = {
  name: 'ConsoleFooterBar',
  description:
    'The always-visible bar at the bottom of the live console: "G games recorded · A in play · W waiting" and Session done, which is disabled offline with "Connect to finish and sync this session."',
  usage: [
    'The container counts completed matches (Match done, not invalid), active matches and waiting matches from useSessionMatches and passes online from the sync state.',
    'Session done opens the Session done review (Queue › Session finalization); the bar never finalizes anything itself. Leave onSessionDone out to keep the button disabled.',
    'Inside the operator shell the bar starts at the rail edge through the --rail custom property. At 900 px and below it is hidden because the dock carries Session done.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE › viewConsole() .footer-bar.dock-dup',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
    'docs/business_logic/product/queue/modules/sessions/README.md#ending',
  ],
  related: ['StartSessionBar', 'LiveLeaderboard', 'AppShell', 'OfflineBand'],
} satisfies ComponentMeta
