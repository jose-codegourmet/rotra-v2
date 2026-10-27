import type { ComponentMeta } from '@rotra/ui/meta'

export const startMatchSheetMeta = {
  name: 'StartMatchSheet',
  description:
    'D-START-MATCH: "Start match N" with the format chip (plus Fun game), Team A VS Team B with switch sides, the free-court buttons (two for 5v5), the block reason when the match is not ready, and Back / Start match.',
  usage: [
    'Open it from Review and start on a free court, Start on a ready queue card, or Start here in ChooseMatchSheet. Preselect the court that opened it (plus a second free court for 5v5) through courtIds.',
    'Pass status from matchStatus(match, ctx): anything but ready shows the reason as an error notice and keeps Start match disabled. Start match is also disabled until the required courts are chosen.',
    'Set isPending while useStartMatch runs: Start match cannot fire twice and the sheet cannot be dismissed. When the recheck fails, keep the sheet open and pass message "Something changed. Review the match again."',
    'Starting is an explicit Queue Master action: never open or confirm this sheet automatically when a court frees up.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.dispatch (ACT.openDispatch, ACT.pickCourt, ACT.confirmDispatch)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['CourtPicker', 'ChooseMatchSheet', 'TeamLineup', 'MatchPlayerCard', 'SuggestedMatchSheet', 'Notice'],
} satisfies ComponentMeta
