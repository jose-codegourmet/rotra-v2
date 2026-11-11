import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionCalendarMeta = {
  name: 'SessionCalendar',
  description:
    'The club dashboard calendar: a month grid on desktops, a week of day columns on tablets and a single day with a week strip on phones. Every prepared, live, past and cancelled session opens from it. A Cancelled session has a hollow legend key and a struck-through title.',
  usage: [
    'Use once on Q-HOME under the now card. The container maps each session to an event kind and decides which screen a session opens (console, preparation or record).',
    'Pass `view` only to force a layout (stories); otherwise it follows the window and redraws on resize.',
    'Dates report through onOpenDay (the container opens CalendarDaySheet); Previous / Today / Next report through onMove and onToday.',
    'The public club page (P07) reuses the month view through ClubCalendar: kindLabels / legend (Happening now, Scheduled, Done), canMovePrevious / canMoveNext, dayOpens="select", phoneDots and children (the day list under the grid).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HOME › calendarCard() (month, week and day views)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  variants: ['month', 'week', 'day'],
  related: ['CalendarDaySheet', 'NowCard', 'ClubHeader', 'ClubCalendar'],
} satisfies ComponentMeta
