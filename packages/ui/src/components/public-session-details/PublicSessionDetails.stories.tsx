import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicSessionDetails } from './PublicSessionDetails'

const session = queueSessionFixtures.sessions[0]
if (!session) throw new Error('Session fixture missing')
const courts = queueSessionFixtures.courts.filter((c) => c.sessionId === session.id)

// The prototype's fmtDate / fmtTime / fmtDur: "Sun, Oct 26, 6:00 PM–9:00 PM (3 h)".
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const fmtDur = (a: number, b: number) => {
  let m = Math.round((b - a) / 60000)
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}

const meta = {
  title: 'Queue/PublicSession/PublicSessionDetails',
  component: PublicSessionDetails,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: {
    when: `${fmtDate(session.scheduledStartAt)}, ${fmtTime(session.scheduledStartAt)}–${fmtTime(session.scheduledEndAt)} (${fmtDur(session.scheduledStartAt, session.scheduledEndAt)})`,
    venueName: session.venueName,
    venueAddress: session.venueAddress,
    courtLabels: courts.map((c) => c.label),
    formats: { singles: session.allowSingles, doubles: session.allowDoubles },
    modeLabel: 'Fair',
    modeDescription: 'Mainly level-matched games, roughly 10% easy games.',
    minimumGames: session.minimumGames,
    notes: session.notes,
    lastUpdatedLabel: fmtTime(session.scheduledStartAt - 18 * 60000),
    hasPendingChanges: false,
  },
} satisfies Meta<typeof PublicSessionDetails>

export default meta
type Story = StoryObj<typeof meta>

export const WithNotes: Story = {}
export const WithoutNotes: Story = { args: { notes: null } }

/** The server knows venue changes are still waiting to sync. */
export const PendingSync: Story = { args: { hasPendingChanges: true } }

export const SinglesAndDoubles: Story = { args: { formats: { singles: true, doubles: true } } }
export const NoStandardFormat: Story = { args: { formats: { singles: false, doubles: false } } }
export const NoAddress: Story = { args: { venueAddress: null } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

export const LongNames: Story = {
  args: {
    venueName: 'RK Sports Center Multi-Purpose Badminton and Community Gymnasium',
    venueAddress: 'RK Sports Center Compound, Lapu-Lapu City, Cebu 6015',
    courtLabels: ['Court 1 (near entrance)', 'Court 2', 'Court 3', 'Court 4', 'Court 5', 'Court 6'],
  },
  globals: { viewport: { value: 'phone' } },
}
