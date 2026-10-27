import type { ComponentMeta } from '@rotra/ui/meta'

export const startMatchMeta = {
  name: 'StartMatch',
  description:
    'The Start match and Pick another sheet container (Q-DISPATCH / D-START-MATCH and Q-CHOOSE-MATCH): StartMatchSheet with its CourtPicker on useStartMatch and useSwapPlayers, and ChooseMatchSheet over the waiting queue, all from useQueueSession, useSessionRoster and useSessionMatches with the match rules (matchStatus, freeCourts, courtsNeeded).',
  usage: [
    'Mounted once by SessionConsole; opened by Review and start on a free court card (that court preselected), by Start on a ready queue card in the Queue view or the upcoming row (the first free court), by Pick another on a free court card (ChooseMatchSheet, whose Start here reopens it as a Start match request for that court). A 5v5 preselects a second free court. Keep one instance per console.',
    'Owns the start mutation and its toasts: a fresh operationId per open, so repeated taps cannot start twice; success toasts "Match N started on Court X" and closes; "Something changed. Review the match again." toasts, keeps the sheet open with the reason shown and refetches the session, roster and matches. Offline (with a downloaded copy) the start saves locally and the toast ends in " · Saved on this device, waiting to sync". Next save fails (DevMenu) rejects the write before any store change: "Changes could not be saved" is an error toast and an error notice inside the sheet, the match stays waiting with its chosen courts, and Start match retries with the same operation ID.',
    'Switching sides in the sheet calls useSwapPlayers: the waiting match becomes manual and protected, with the same toast as the Queue view. A player card opens PlayerProfile with Back to match; closing it returns to the same sheet state.',
    'A match that stopped waiting while the sheet was open simply closes. No match ever starts without this confirmation.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-control.md#q-dispatch--start-a-waiting-match',
    'docs/screens/product/modules/queue/match-control.md#q-choose-match--pick-another-match-for-a-court',
    'docs/screens/product/dialogs.md#d-start-match--start-match',
    'docs/business_logic/product/queue/modules/matches/README.md#start-and-completion',
  ],
  related: [
    'StartMatchSheet',
    'CourtPicker',
    'ChooseMatchSheet',
    'TeamLineup',
    'PlayerProfile',
    'SessionView',
    'QueueView',
    'SessionConsole',
  ],
} satisfies ComponentMeta
