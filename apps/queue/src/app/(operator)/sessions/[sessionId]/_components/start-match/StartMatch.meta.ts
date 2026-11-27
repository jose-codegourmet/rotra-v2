import type { ComponentMeta } from '@rotra/ui/meta'

export const startMatchMeta = {
  name: 'StartMatch',
  description:
    'The Put on court and Pick another sheet container (Q-DISPATCH / D-START-MATCH and Q-CHOOSE-MATCH): StartMatchSheet ("Put match N on court") with its CourtPicker on usePlaceOnCourt and useSwapPlayers, and ChooseMatchSheet over the waiting queue, all from useQueueSession, useSessionRoster and useSessionMatches with the match rules (matchStatus, freeCourts, courtsNeeded).',
  usage: [
    "Mounted once by SessionConsole; opened by Start on a ready queue card in the Queue view or the upcoming row (the first free court), by Put on court on a free court card for a 5v5 (that court preselected plus a second free court), and by Pick another on a free court card (ChooseMatchSheet, Put a match on Court N: each card's Put on Court N puts a one-court match straight on that court and reopens a 5v5 as a Put on court request for that court; Edit opens the lineup editor through onEditMatch). Keep one instance per console.",
    'Owns the place mutation and its toasts: nothing starts here, the match goes On court (getting ready) and is started from its court card or the On court sheet. A fresh operationId per open, so repeated taps cannot place twice; success toasts "Match N on Court X · getting ready" and closes; "Something changed. Review the match again." toasts, keeps the sheet open with the reason shown and refetches the session, roster and matches. Offline (with a downloaded copy) the start saves locally and the toast ends in " · Saved on this device, waiting to sync". Next save fails (DevMenu) rejects the write before any store change: "Changes could not be saved" is an error toast and an error notice inside the sheet, the match stays waiting with its chosen courts, and Put on court retries with the same operation ID.',
    'Switching sides in the sheet calls useSwapPlayers: the waiting match becomes manual and protected, with the same toast as the Queue view. A player card opens PlayerProfile with Back to match; closing it returns to the same sheet state.',
    "Stacked dialogs: Put a match on Court N opened from Court N is free returns to it on ×, Escape, the scrim and ← Back (onClose, one level); opened by Pick another it closes. Edit opens the Edit lineup sheet over it and closing that returns here; a 5v5's Put on court opens over it too. Putting a match on court calls onDone, which closes the whole stack.",
    'A match that stopped waiting while the sheet was open simply closes.',
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
