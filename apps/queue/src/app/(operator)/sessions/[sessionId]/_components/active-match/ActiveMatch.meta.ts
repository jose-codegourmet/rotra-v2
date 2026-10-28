import type { ComponentMeta } from '@rotra/ui/meta'

export const activeMatchMeta = {
  name: 'ActiveMatch',
  description:
    'The in-game control container (Q-ACTIVE-MATCH, Q-MATCH-DONE, D-WINNER, Q-INVALID-MATCH / D-INVALID-MATCH, Q-SUBSTITUTE / D-SUBSTITUTE): one sheet whose step lives in local state, on ActiveMatchSheet, MatchResultForm, ConfirmResultSheet, InvalidMatchSheet and SubstitutionSheet over useQueueSession, useSessionRoster and useSessionMatches, committed with useCompleteMatch, useInvalidateMatch and useSubstitutePlayer.',
  usage: [
    'Mounted once by SessionConsole and opened by Open match on an in-game court card (SessionView passes the match id through onOpenMatch). Mounted per match, so each Open match starts on the active step with nothing chosen; "M min in" and the replacement tiles\' rest minutes follow the console clock.',
    'Match done: MatchResultForm validates the winner or the score (Review result), ConfirmResultSheet shows the winner, score or "No score entered" and the court(s), and Confirm Team A wins calls useCompleteMatch; success toasts "Team A wins match N · Court X free" and closes, and the query invalidation updates the leaderboard, game counts and court cards. Back to result reopens the form with what was entered.',
    'Mark invalid: InvalidMatchSheet on useInvalidateMatch; success toasts "Match N marked invalid · Court X free" (both courts for 5v5) and closes; Keep playing returns to the active sheet.',
    'Substitute player: SubstitutionSheet pick (everyone in the match, then present players not in this match and not playing elsewhere) → Confirm substitution → useSubstitutePlayer; success toasts "Nathan in for Raymark" and returns to the active sheet, where the substitution line appears. Back on the pick step returns to the active sheet; Back on the confirm step keeps the choice.',
    'Closing at any step before a confirmation changes nothing and the court stays in use. The operation ID is created when a review or confirm step opens and reused on a retry, so a timeout never produces a competing outcome; a failed commit shows inside the sheet and nothing is claimed as saved. After confirmation there is no Undo, Change winner, Add score later or Reopen; browser Back or closing a sheet never reverses a confirmed result or invalid decision, and the console then shows the court free.',
    'Next save fails (DevMenu) rejects the write before any store change: "Changes could not be saved" is an error toast and an error notice in the open dialog, the match stays active with its court(s) in use, the typed scores or chosen substitution stay, and Confirm retries with the same operation ID. "Something changed" refetches the session, roster and matches so the dialog shows what changed. Offline with a downloaded copy, each confirmation saves locally, the outcome is permanent at once and its toast ends in " · Saved on this device, waiting to sync". Primary buttons are disabled while pending, so a double-click produces one outcome; Mark invalid and Confirm invalid match keep the danger style, are never focused on open (focus starts on the title) and are separate from Match done.',
    'Player cards open PlayerProfile with Back to match. When the match is no longer active (confirmed elsewhere, or the session refetched after a decision) the sheet closes.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-control.md#q-active-match--in-game-control',
    'docs/screens/product/modules/queue/match-control.md#q-match-done--two-completion-paths',
    'docs/screens/product/modules/queue/match-control.md#q-invalid-match--end-without-a-counted-game',
    'docs/screens/product/modules/queue/match-control.md#q-substitute--mid-game-replacement',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md#start-and-completion',
    'docs/business_logic/product/queue/modules/matches/README.md#substitutions',
    'docs/business_logic/product/queue/modules/matches/README.md#invalid-match',
  ],
  related: [
    'ActiveMatchSheet',
    'MatchResultForm',
    'ConfirmResultSheet',
    'InvalidMatchSheet',
    'SubstitutionSheet',
    'PlayerProfile',
    'SessionView',
    'SessionConsole',
  ],
} satisfies ComponentMeta
