import type { ComponentMeta } from '@rotra/ui/meta'

export const dateTimePickerMeta = {
  name: 'DateTimePicker',
  description:
    'A date-and-time picker: an empty option ("Session start" | "Set time") when the field has one, day buttons when the field can fall on more than one day (or, on Ends, an "Ends the next day" switch inside the time dialog), then one time field ("7:00 PM", clock icon, chevron) that opens the time dialog: the time in large type, AM | PM, 12 hour buttons, :00 :15 :30 :45 and Done. Only valid times can be pressed (15-minute steps inside min / max); an existing off-grid value keeps its minute as an extra button. Each press sets the value at once.',
  usage: [
    'Place inside a Field. Value is an epoch-millisecond instant or null; onChange receives the same, so React Hook Form field.onChange can be passed in. Pass field.ref as ref: it lands on the time field button, or on the empty-option group while the empty option is on. onBlur does not fire while the time dialog is open.',
    'Pass the days the field may fall on, and inclusive min / max instants. Day buttons hide when only one day is offered. Use emptyLabel for "Session start" / "Session end"; Set time then starts from fallback when it is valid, else the first valid time.',
    'Ends: pass two days with nextDaySwitch to drop the day buttons and put the "Ends the next day" switch at the bottom of the time dialog (it keeps the clock time when valid on the other day, else takes its first valid time). Pass suffix ("next day") for the muted second line in the field.',
    'Hour change keeps the minute when valid, else the first valid minute in that hour. AM/PM change keeps hour and minute when valid in that half, else its first valid time. Buttons that give no valid time are disabled; a day with none shows "No times left on this day" instead of the time field.',
    'Works inside another dialog (Add court, Edit Court N, Start session, Courts and time): the time dialog stacks on top, and closing it (Done, ×, Escape, backdrop) returns focus to the time field in the dialog behind.',
    'Fits a half-width column on a 375 px phone. Do not use for the session calendar date. Use DatePicker.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Session setup › Details › Starts, Ends; Courts planned start/end; Start session / Courts and time New end',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md#date-and-time-picker',
    'docs/screens/product/experience-contract.md#times-and-days',
    'docs/business_logic/product/queue/modules/sessions/README.md#times-and-days-owner-decision-november-6-2026',
  ],
  related: ['Field', 'DatePicker', 'TimeField', 'SegmentedControl', 'Sheet', 'Switch'],
} satisfies ComponentMeta
