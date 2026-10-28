import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionDoneSheetMeta = {
  name: 'SessionDoneSheet',
  description:
    'The three-step Session done sheet: the closure review (games recorded, participants, sync, games in play, unplayed waiting matches, shortfalls), the D-MINIMUM shortfall list, and the D-SESSION-DONE Finish this session? confirmation. Session done closes the whole Queue Session, never one match.',
  usage: [
    'Open from Session done in the console footer. The container (Q07.5) owns open/close state and the step: review → minimum when anyone is below the minimum, otherwise review → confirm.',
    'Pass the counts and the court labels of games still in play; the sheet only blocks (Continue is disabled while any game is active or offline) and never finishes or invalidates games itself.',
    'Confirm Session done is disabled while pendingChanges > 0, offline, or isPending; isPending also hides Close and blocks Back and Escape.',
    'Copy is fixed by dialogs.md (D-MINIMUM, D-SESSION-DONE) and session-finalization.md; counts pluralise like the prototype (1 game is / 2 games are). The prototype reviewer note about unfinished games is not product copy and is not rendered.',
    'The missing-records check (D-INTERRUPTION) is a separate flow, not a step here.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'SHEETS.done (Session done / Some players are below the minimum / Finish this session?)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-finalization.md#q-session-done--online-closure-review',
    'docs/screens/product/dialogs.md#d-minimum--shortfall-acknowledgement',
    'docs/screens/product/dialogs.md#d-session-done--whole-session',
    'docs/business_logic/product/queue/modules/sessions/README.md#ending',
    'docs/business_logic/product/queue/modules/results/README.md#finalization-versus-publishing',
  ],
  variants: ['review', 'minimum', 'confirm'],
  related: [
    'Sheet',
    'ConfirmSheet',
    'Notice',
    'KeyValueList',
    'ConsoleFooterBar',
    'LiveLeaderboard',
  ],
} satisfies ComponentMeta
