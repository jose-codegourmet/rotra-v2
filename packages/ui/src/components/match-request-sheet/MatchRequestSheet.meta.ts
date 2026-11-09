import type { ComponentMeta } from '@rotra/ui/meta'

export const matchRequestSheetMeta = {
  name: 'MatchRequestSheet',
  description:
    'Q-PUBLIC-DETAILS (My night › Request a match): a present Player asks the Queue Master for a match. A Format row of six pills (2 v 2, 1 v 1, 1 v 2, 3 v 3, 4 v 4, 5 v 5; formats the session does not allow are greyed), the request drawn on the console court with the viewer on the left (You) and a dashed "+" or a picture at every partner and opponent spot, the picked spots listed under it with Change and a clear button, and Cancel / Send request.',
  usage: [
    'Controlled and presentational. The app keeps the format and the spots: partners and opponents have one entry per spot the format needs (requestSpots in @rotra/data/match-request/rules), null is Anyone. Pass allowedFormats from allowedRequestFormats(session); the caller starts on the first allowed format (2 v 2 by default) and trims or pads the spots when the format changes.',
    'onPickSpot({ side, index }) fires from a court spot or a picked row: the app opens PlayerPickerSheet (variant matchRequest) on top, with spotLabel "Partner" / "Opponent 1" and the other spots in pickedIds. onClearSpot sets that spot back to Anyone.',
    'With no format allowed the pills are all greyed and Send request still calls onSend: the app shows the toast "This session isn\'t taking match requests" (and normally never opens the sheet). Pass isPending while sending and error when it fails.',
    'The request-sent state ("Match request sent · the QM decides") lives in MyNightCard, not here. The QM side is MatchRequestCard.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › My night › Request a match sheet (SHEETS.matchReq, .mr-pitch, .mr-fmts)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-09-queue-match-request-court.md',
  ],
  related: [
    'PlayerPickerSheet',
    'CourtDrawing',
    'SegmentedControl',
    'Sheet',
    'MyNightCard',
    'MatchRequestCard',
  ],
} satisfies ComponentMeta
