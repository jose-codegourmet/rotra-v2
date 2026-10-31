import type { ComponentMeta } from '@rotra/ui/meta'

export const datePickerMeta = {
  name: 'DatePicker',
  description:
    'A field-styled date button showing the long date ("Tuesday, October 27, 2026") that opens a month calendar; picking a day sets it.',
  usage: [
    'Place inside a Field. Value is "YYYY-MM-DD"; onChange receives the same string, so React Hook Form field.onChange can be passed in.',
    'Pass min={today} to block past days (max={today} blocks future days, e.g. a payment date), and markedDates + markedLabel + markedLegend to show days the club already has a session.',
    'The full Choose a date dialog with a selected-date summary and Set date is a product component (Q02.4) built on DateCalendar.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Session setup › Details › Date (.input.date-btn) and Choose a date (.dp-*)',
  },
  docs: ['docs/coding-conventions.md#6-forms'],
  related: ['DateCalendar', 'TimeField', 'Field'],
} satisfies ComponentMeta
