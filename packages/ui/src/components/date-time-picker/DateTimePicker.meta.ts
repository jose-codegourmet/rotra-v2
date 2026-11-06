import type { ComponentMeta } from '@rotra/ui/meta'

export const dateTimePickerMeta = {
  name: 'DateTimePicker',
  description:
    'A date-and-time picker: day buttons when the field can fall on more than one day, then a list of only the valid times in 15-minute steps. An existing off-grid value stays listed so it can be kept.',
  usage: [
    'Place inside a Field. Value is an epoch-millisecond instant or null; onChange receives the same, so React Hook Form field.onChange can be passed in.',
    'Pass the days the field may fall on, and inclusive min / max instants. Day buttons hide when only one day is offered. Use emptyLabel for "Session start" / "Session end".',
    'Do not use for the session calendar date. Use DatePicker. Do not use a clock-only TimeField for session or court times — those carry their day.',
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
