import type { ComponentMeta } from '@rotra/ui/meta'

export const invalidMatchSheetMeta = {
  name: 'InvalidMatchSheet',
  description:
    'D-INVALID-MATCH, the "Mark match invalid?" dialog: Match N on Court X, both teams, the notice that no game, win, loss or minimum-game credit will be recorded, Keep playing and the destructive "Confirm invalid match".',
  usage: [
    'Open it from Mark invalid on the active match sheet. Pass the match number, its court label(s) and both teams as TeamLineup players.',
    'onConfirm fires once per attempt: pass isPending from useInvalidateMatch and error when it fails. The container frees the court(s) only after the durable save and shows "Match N marked invalid · Court X free".',
    'The decision is permanent: say "invalid", never "void"; there is no reason field and no later undo.',
    'Keep playing (onKeepPlaying) returns to the active match. Focus starts on the title, so the destructive primary is never preselected.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.invalid · ACT.confirmInvalid',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['ConfirmSheet', 'TeamLineup', 'MatchResultForm', 'ConfirmResultSheet', 'Notice'],
} satisfies ComponentMeta
