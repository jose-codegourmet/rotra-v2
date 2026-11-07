import type { ComponentMeta } from '@rotra/ui/meta'

export const onCourtMeta = {
  name: 'OnCourt',
  description:
    'The Q-ON-COURT container: OnCourtSheet for a match On court (placed, not started) from useQueueSession, useSessionRoster and useSessionMatches with the match rules (matchStatus, swapTarget, freeCourts, countedGames), and Start match on useStartMatch.',
  usage: [
    'Mounted once by SessionView and opened by Open match on a Getting ready court card. Mounted per match, so each open gets a fresh operationId; it closes by itself once the match is no longer On court.',
    'Start match is one tap with the held court(s): success toasts "Match N started on Court X" and closes; "Something changed. Review the match again." toasts, stays open with the notice and refetches; a local save failure is an error toast and an error inside the sheet, and Start match retries the same operationId. A player not present or busy (matchStatus) disables Start match with the reason.',
    'Player cards open PlayerProfile with Back to match.',
    'Send back to queue, Move to another court, Replace player and Swap with the queue are wired by Q12.26; switching sides on an On court match has no command yet. Until then those controls do nothing.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md#lifecycle',
    'docs/mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md',
  ],
  related: ['OnCourtSheet', 'CourtCard', 'SessionView', 'StartMatch', 'ActiveMatch', 'PlayerProfile'],
} satisfies ComponentMeta
