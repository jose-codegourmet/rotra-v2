import type { ComponentMeta } from '@rotra/ui/meta'

export const courtPickerMeta = {
  name: 'CourtPicker',
  description:
    'The free-court buttons on the Start match sheet: "Court" with one pressed-state button per free court, or "Choose two free courts" for a 5v5 with the hint "5v5 uses two courts as one match."',
  usage: [
    'Use inside StartMatchSheet (D-START-MATCH); the sheet preselects the court that opened it, plus a second free court for 5v5.',
    'Pass required 1 for every format but fun_5v5, which passes 2. With one court a pick replaces the choice; with two a chosen court toggles off and a third pick replaces the oldest.',
    'The owner passes only free courts (freeCourts in match.rules); the picker never works out availability.',
    'Do not use for the Courts and time sheet or the courts grid: those use CourtCard and AddCourtTile.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.dispatch › .field with data-act="pickCourt" (ACT.pickCourt)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['StartMatchSheet', 'ChooseMatchSheet', 'CourtCard', 'Button'],
} satisfies ComponentMeta
