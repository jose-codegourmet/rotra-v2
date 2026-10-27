import type { ComponentMeta } from '@rotra/ui/meta'

export const calendarDaySheetMeta = {
  name: 'CalendarDaySheet',
  description:
    "The dashboard calendar's day dialog: the full date (plus · Today), that day's sessions with state chips, Close, and Create session today / on this day for dates that are today or later.",
  usage: [
    'Open it from SessionCalendar.onOpenDay (a date or "+N more"); each row calls onOpenSession so the container can route to the console, preparation or record.',
    'Past dates get no create action. Escape and Close return focus to the date that opened it (Sheet does this).',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-HOME › SHEETS.calDay',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['SessionCalendar', 'Sheet', 'Chip'],
} satisfies ComponentMeta
