import type { ComponentMeta } from '@rotra/ui/meta'

export const dateCalendarMeta = {
  name: 'DateCalendar',
  description:
    'One month of selectable days: previous/next month, today ringed in accent, the chosen day filled, past days disabled, and dots on marked days.',
  usage: [
    'DatePicker uses it in its popover. The Choose a date dialog (Q02.4) uses it inside a Sheet.',
    'Pass min to block past days and markedDates for days the club already has a session.',
    'Arrow keys move between days; only one day is in the tab order.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Session setup › Choose a date (.dp-head, .dp-grid, .dp-day)',
  },
  related: ['DatePicker'],
} satisfies ComponentMeta
