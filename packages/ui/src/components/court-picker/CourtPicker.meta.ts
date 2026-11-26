import type { ComponentMeta } from '@rotra/ui/meta'

export const courtPickerMeta = {
  name: 'CourtPicker',
  description:
    'The free-court tiles on Put on court and Move match: a grid of large tiles (at least 140 x 76 px) with the bold court name, "Free now" under it and a round check that fills when picked (accent border and tint). "Court" for one, or "Choose two free courts" for a 5v5 with the hint "5v5 uses two courts as one match."',
  usage: [
    'Use inside StartMatchSheet (D-START-MATCH, Put on court) and MoveMatchSheet (pass label "Move to"); the sheet preselects the court that opened it, plus a second free court for 5v5.',
    'Pass required 1 for every format but fun_5v5, which passes 2. With one court a pick replaces the choice; with two a chosen court toggles off and a third pick replaces the oldest.',
    'The owner passes only free courts (freeCourts in match.rules); the picker never works out availability.',
    'Do not use for the Courts and time sheet or the courts grid: those use CourtCard and AddCourtTile.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.dispatch and SHEETS.moveCourt › .court-pick (ACT.pickCourt)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['StartMatchSheet', 'MoveMatchSheet', 'ChooseMatchSheet', 'CourtCard', 'Button'],
} satisfies ComponentMeta
