import type { ComponentMeta } from '@rotra/ui/meta'

export const onCourtMeta = {
  name: 'OnCourt',
  description:
    'The Q-ON-COURT container: OnCourtSheet for a match On court (placed, not started) from useQueueSession, useSessionRoster and useSessionMatches with the match rules (matchStatus, swapTarget, freeCourts, countedGames), and Start match on useStartMatch.',
  usage: [
    'Mounted once by SessionView and opened by Open match on a Getting ready court card. Mounted per match, so each open gets a fresh operationId; it closes by itself once the match is no longer On court.',
    'Start match is one tap with the held court(s): success toasts "Match N started on Court X" and closes; "Something changed. Review the match again." toasts, stays open with the notice and refetches; a local save failure is an error toast and an error inside the sheet, and Start match retries the same operationId. A player not present or busy (matchStatus) disables Start match with the reason.',
    'Player cards open PlayerProfile with Back to match.',
    'Send back to queue (useSendBackToQueue) toasts "Match N back to #1 in the queue · Court X free" and closes. Replace player (ReplacePlayerSheet, useReplacePlayer) and Move to another court (MoveMatchSheet, useMoveCourt) toast and return to the On court sheet. Swap with #P opens SwapMatchSheet (Back to match) on useSwapWithQueue and closes on success. The court card ⋯ menu opens the swap sheet directly with swapFirst (Cancel). Each failure follows Start match: "Something changed" notice and refetch on a recheck, error toast and notice on a save failure.',
    'Switching sides on an On court match has no command yet (swapPlayers takes waiting matches only), so dragging does nothing.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md#lifecycle',
    'docs/mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md',
  ],
  related: [
    'OnCourtSheet',
    'CourtCard',
    'SessionView',
    'StartMatch',
    'ActiveMatch',
    'PlayerProfile',
  ],
} satisfies ComponentMeta
