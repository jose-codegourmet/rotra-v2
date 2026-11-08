import type { ComponentMeta } from '@rotra/ui/meta'

export const timeFieldMeta = {
  name: 'TimeField',
  description:
    'The time field of every date-and-time picker: an input-styled button with a clock icon, the time ("7:00 PM") and a chevron. Pressing it opens the time dialog (a bottom sheet on a phone, titled with the field name): the time in large type, an AM | PM switch, Hour buttons (12, 1 … 11, six per row), Minute buttons (:00 :15 :30 :45, plus an off-grid value\'s minute) and Done. Each press sets the value at once.',
  usage: [
    'Value is an epoch-millisecond instant; its calendar day is the day picked on, and the buttons change only the clock time. Pass inclusive min / max: buttons that give no valid time are disabled.',
    'Normally used through DateTimePicker, which adds the empty option, the day buttons and the "Ends the next day" switch (nextDay). Use it directly only when the day is fixed and always set.',
    'Close with Done, ×, Escape or the backdrop. Inside another dialog the time dialog stacks on top and closing returns focus to this field.',
    'suffix adds a muted second line under the time ("next day"). Place inside a Field so it picks up the error description and aria-invalid.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Session setup › Details › Starts, Ends (timePick sheet); Courts planned start/end; Add / Edit court; Start session; live end',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md#date-and-time-picker',
    'docs/screens/product/experience-contract.md#times-and-days',
  ],
  related: ['DateTimePicker', 'Field', 'Sheet', 'SegmentedControl', 'Switch'],
} satisfies ComponentMeta
