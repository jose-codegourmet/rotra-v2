import type { ComponentMeta } from '@rotra/ui/meta'

export const clubDashboardMeta = {
  name: 'ClubDashboard',
  description:
    'Q-HOME container: useClub, useClubLicense, useNowCard and useQueueSessions wired to ClubHeader, NowCard, SessionCalendar and CalendarDaySheet.',
  usage: [
    'Rendered by app/(operator)/page.tsx. Live sessions open the console, prepared ones preparation, completed and invalid ones the session record.',
    'Create session goes to /sessions/new, with ?date=YYYY-MM-DD when started from a calendar day.',
  ],
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['ClubHeader', 'NowCard', 'SessionCalendar', 'CalendarDaySheet'],
} satisfies ComponentMeta
