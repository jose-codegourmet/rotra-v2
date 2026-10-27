import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NowCard, type NowCardLive, type NowCardUpcoming } from './NowCard'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const MINUTE = 60_000
const HOUR = 60 * MINUTE
// The fixtures are seeded at 6 PM today; a fixed "now" keeps each countdown form on screen.
const start = tonight.scheduledStartAt

const live: NowCardLive & { now: number } = {
  variant: 'live',
  title: tonight.title,
  venueName: tonight.venueName,
  startsAt: tonight.scheduledStartAt,
  endsAt: tonight.scheduledEndAt,
  courtsInUse: 1,
  courts: 3,
  gamesPlayed: 6,
  presentCount: 14,
  rosterCount: 14,
  queuedCount: 3,
  now: start + HOUR,
  onContinue: fn(),
}

const upcoming: NowCardUpcoming & { now: number } = {
  variant: 'upcoming',
  title: tonight.title,
  venueName: tonight.venueName,
  startsAt: start,
  endsAt: tonight.scheduledEndAt,
  rosterCount: 14,
  capacity: 24,
  waitlistCount: 2,
  courts: 3,
  downloadedHere: false,
  now: start - 45 * MINUTE,
  onOpenPreparation: fn(),
}

const meta = {
  title: 'Queue/NowCard',
  component: NowCard,
  args: live,
} satisfies Meta<typeof NowCard>

export default meta
type Story = StoryObj<typeof NowCard>

export const Live: Story = { args: live }
export const LivePastEndTime: Story = {
  args: { ...live, now: tonight.scheduledEndAt + 10 * MINUTE },
}
export const LiveWithUpNext: Story = {
  args: { ...live, upNext: { title: 'Thursday Open Play', startsAt: start + 4 * 24 * HOUR } },
}
export const UpcomingStartsInMinutes: Story = { args: upcoming }
export const UpcomingStartsInHours: Story = {
  args: { ...upcoming, now: start - (2 * HOUR + 15 * MINUTE) },
}
export const UpcomingTomorrow: Story = { args: { ...upcoming, now: start - 24 * HOUR } }
export const UpcomingInDays: Story = { args: { ...upcoming, now: start - 3 * 24 * HOUR } }
export const UpcomingStartingNow: Story = { args: { ...upcoming, now: start + 5 * MINUTE } }
export const UpcomingWasDue: Story = { args: { ...upcoming, now: start + 40 * MINUTE } }
export const UpcomingDownloaded: Story = { args: { ...upcoming, downloadedHere: true } }
export const NothingPlanned: Story = { args: { variant: 'nothing', onCreateSession: fn() } }
const longTitle: NowCardLive = {
  ...live,
  title: 'Sunday Night Queue and Beginners Welcome Session at the Annex Courts',
  venueName: 'Banilad Sports Hub Annex Covered Courts',
}
export const LongTitle: Story = {
  args: longTitle,
  globals: { viewport: { value: 'phone' } },
}
