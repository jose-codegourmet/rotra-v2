import type { ComponentMeta } from '@rotra/ui/meta'

export const dateTimePickerMeta = {
  name: 'DateTimePicker',
  description:
    'A date-and-time picker: an empty option ("Session start" | "Set time") when the field has one, day buttons when the field can fall on more than one day, then one row of hour : minute and AM/PM dropdowns. Only valid times can be picked (15-minute steps inside min / max); an existing off-grid value keeps its minute offered so it can be kept. Each change sets the value at once.',
  usage: [
    'Place inside a Field. Value is an epoch-millisecond instant or null; onChange receives the same, so React Hook Form field.onChange can be passed in. Pass field.ref as ref: it lands on the hour dropdown, or on the empty-option group while the empty option is on.',
    'Pass the days the field may fall on, and inclusive min / max instants. Day buttons hide when only one day is offered. Use emptyLabel for "Session start" / "Session end"; Set time then starts from fallback when it is valid, else the first valid time.',
    'Hour change keeps the minute when valid, else the first valid minute in that hour. AM/PM change keeps hour and minute when valid in that half, else its first valid time. Options that give no valid time are disabled; a day with none shows "No times left on this day".',
    'The row fits a half-width column on a 375 px phone. Do not use for the session calendar date. Use DatePicker. Do not use a clock-only TimeField for session or court times — those carry their day.',
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
  related: ['Field', 'DatePicker', 'TimeField', 'SegmentedControl'],
} satisfies ComponentMeta
