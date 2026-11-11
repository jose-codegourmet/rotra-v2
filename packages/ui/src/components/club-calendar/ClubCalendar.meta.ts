import type { ComponentMeta } from '@rotra/ui/meta'

export const clubCalendarMeta = {
  name: 'ClubCalendar',
  description:
    "The public club page's Calendar: the Queue dashboard's month view (SessionCalendar, extended, not forked) with every session of the club, upcoming and done, as Happening now / Scheduled / Done chips; dots on phones; a tapped date lists its sessions under the grid.",
  usage: [
    'Pass every session of the club (never cancelled). A done session whose page is gone (after three months) has href null and shows “Session page no longer available”.',
    'Previous / Next are disabled at the oldest session’s month and the last upcoming session’s month; Today jumps back and selects today.',
    'Tapping a date (or a chip) selects it; tapping it again clears the list.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › clubCalendarFull (.cal-grid2, .cal-card)',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['month', 'day-selected', 'empty-month', 'first-month', 'last-month'],
  related: ['SessionCalendar', 'ClubSessionList'],
} satisfies ComponentMeta
