import type { ComponentMeta } from '@rotra/ui/meta'

export const courtsAndTimeSheetMeta = {
  name: 'CourtsAndTimeSheet',
  description:
    'The Courts and time sheet (Q-SESSION-ADJUST), opened by Courts and time in the live header and by Set end time on the overdue banner: the individual court windows with Edit and guarded Remove, plus "Add a court…", "Ends 9:00 PM" (with its day, and "· Planned end passed N ago" in warning when overdue), a New end date-and-time picker with Set end time and the Extend 30 min / Extend 60 min shortcuts, "Start time is fixed: it records when play began.", and the note that occupied courts and running matches are not changed here.',
  usage: [
    "Pass the session's courts (not removed), scheduledEndAt as endsAt, and startsAt as when play began. onAddCourt opens AddCourtForm; onExtend(30 | 60) runs the extension in the container.",
    'onSetEndTime(endAt) shows the New end picker (times after now, later or earlier than the current end, up to 24 h after startsAt; day buttons when that spans two days). New end starts from the current end, or the next 15-minute step after now when overdue. Set end time is disabled until the choice is after now; "Choose an end time after now." is checked here.',
    'Court conflicts come from the container through endTimeError, word for word: "Court 3 opens 9:30 PM. Pick a later end, or edit that court first." / "Court 2 is booked until 10:00 PM. Pick a later end, or edit that court first." onNewEndChange lets the container clear it when the choice changes. The toast ("Session ends at 9:30 PM · public page updates after sync") is the container\'s.',
    'Pass focusEnd when opened from the overdue banner so focus moves to the New end time list. Without onSetEndTime only the Extend shortcuts show.',
    'Pass isPending while a change runs so one tap cannot change the end twice; the sheet stays open and Done closes it.',
    'Remove is available for unoccupied courts while at least one court remains. A used start is fixed; mode, formats and the minimum stay unchanged during play.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.adjust (ACT.openAdjust, ACT.quickAddCourt, ACT.setEnd, ACT.extend)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-session-adjust--courts-and-time',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
    'docs/business_logic/product/queue/modules/sessions/README.md#times-and-days',
  ],
  // Individual booking starts control dispatch; ends remain advisory.
  related: ['AddCourtForm', 'DateTimePicker', 'OverdueBanner', 'Sheet', 'Button'],
} satisfies ComponentMeta
