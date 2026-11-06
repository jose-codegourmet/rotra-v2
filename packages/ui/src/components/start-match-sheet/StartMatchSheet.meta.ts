import type { ComponentMeta } from '@rotra/ui/meta'

export const startMatchSheetMeta = {
  name: 'StartMatchSheet',
  description:
    'D-START-MATCH step 1 (Q-DISPATCH): "Put match N on court" with the format chip (plus Fun game), Team A VS Team B with switch sides, the free-court buttons (two for 5v5), the block reason when the match is not ready, and Back / Put on court. Placing does not start the timer: the match goes On court (Getting ready).',
  usage: [
    'Open it from Put on court on a free court or a ready queue card, or from the row action in ChooseMatchSheet. Preselect the court that opened it (plus a second free court for 5v5) through courtIds.',
    'Pass status from matchStatus(match, ctx): anything but ready shows the reason as an error notice and keeps Put on court disabled. Put on court is also disabled until the required courts are chosen.',
    'onStart is the Put on court action (the prop keeps its name for existing callers): it places the match On court and never starts the timer. Start match happens later in OnCourtSheet or on the court card.',
    'Set isPending while the placement runs: Put on court cannot fire twice and the sheet cannot be dismissed. When the recheck fails, keep the sheet open and pass message "Something changed. Review the match again."; when the local save fails, keep it open with the same courts and pass error "Changes could not be saved" (the owner also toasts it and retries with the same operation ID).',
    'Pass notOpenCourts and onStartAnyway to list courts before their planned start under "Not open yet". Start anyway opens the court early (no second dialog: this sheet is the confirmation), then the owner adds it to courtIds.',
    'In Auto Queue ROTRA places one-court matches itself without this sheet; 5v5 and courts not open yet always come through here. Never confirm this sheet automatically.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.dispatch (ACT.openDispatch, ACT.pickCourt, ACT.confirmDispatch)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: [
    'CourtPicker',
    'OnCourtSheet',
    'ChooseMatchSheet',
    'TeamLineup',
    'MatchPlayerCard',
    'SuggestedMatchSheet',
    'Notice',
  ],
} satisfies ComponentMeta
