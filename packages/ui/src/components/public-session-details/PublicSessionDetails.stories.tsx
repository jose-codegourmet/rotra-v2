import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type PublicSessionCourtNow, PublicSessionDetails } from './PublicSessionDetails'

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

const face = (id: string, name: string): CourtPlayer => ({ id, name, shortName: name, level: null })
/** Masked guests read "Y***" per the public name rule. */
const masked = (id: string, name: string): CourtPlayer => ({
  id,
  name: `${name[0]}***`,
  shortName: `${name[0]}***`,
  level: null,
})

const courtsNow: PublicSessionCourtNow[] = [
  {
    id: 'c1',
    label: 'Court 1',
    merged: false,
    status: 'playing',
    teamA: [face('a', 'Maya'), face('b', 'Jun')],
    teamB: [face('c', 'Dexter'), masked('d', 'Yuri')],
    startedLabel: '9:16 PM',
  },
  {
    id: 'c2',
    label: 'Court 2',
    merged: false,
    status: 'getting-ready',
    teamA: [face('e', 'Ana'), face('f', 'Rico')],
    teamB: [face('g', 'Lia'), face('h', 'Bong')],
  },
  { id: 'c3', label: 'Court 3', merged: false, status: 'free', teamA: [], teamB: [] },
]
const mergedCourt: PublicSessionCourtNow = {
  id: 'c4',
  label: 'Court 4 + Court 5',
  merged: true,
  status: 'playing',
  teamA: ['Ben', 'Cai', 'Dan', 'Eli', 'Fox'].map((n) => face(`a-${n}`, n)),
  teamB: ['Gus', 'Hal', 'Ian', 'Jay', 'Kit'].map((n) => face(`b-${n}`, n)),
  startedLabel: '9:31 PM',
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
    amountDuePerPlayer: 20000,
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

/** Payment: the custom amount or the break-even share; whole pesos have no decimals. */
export const PaymentCustomAmount: Story = { args: { amountDuePerPlayer: 20000 } }
export const PaymentBreakEven: Story = { args: { amountDuePerPlayer: 18750 } }
/** A custom amount of 0 reads "Free" with no "paid at the venue". */
export const PaymentFree: Story = { args: { amountDuePerPlayer: 0 } }
/** No estimate saved: the row is omitted. */
export const NoPaymentEstimate: Story = { args: { amountDuePerPlayer: null } }
export const PaymentPhone: Story = { globals: { viewport: { value: 'phone' } } }
export const PaymentFreeLight: Story = { ...PaymentFree, globals: { theme: 'light' } }
export const PaymentCustomLight: Story = { ...PaymentCustomAmount, globals: { theme: 'light' } }

/** Signed-in, live: Courts now (playing, getting ready, free) and the Queue slot. */
export const SignedInCourtsNow: Story = {
  args: {
    courtsNow,
    queueSlot: (
      <section aria-label="Queue" className="mt-5 flex flex-col gap-3">
        <h2 className="text-lg font-bold">Queue</h2>
        <p className="text-[13px] text-fg2">Read-only · Last synced queue</p>
      </section>
    ),
  },
}
export const SignedInCourtsNowPhone: Story = {
  args: SignedInCourtsNow.args,
  globals: { viewport: { value: 'phone' } },
}
export const SignedInCourtsNowDesktop: Story = {
  args: SignedInCourtsNow.args,
  globals: { viewport: { value: 'desktop' } },
}
export const SignedInCourtsNowLight: Story = {
  args: SignedInCourtsNow.args,
  globals: { theme: 'light' },
}
/** A 5v5 on two courts is one card: "Merged · Playing" on the tall drawing. */
export const MergedCourt: Story = {
  args: { courtsNow: [mergedCourt, courtsNow[2] as PublicSessionCourtNow] },
}
export const MergedCourtGettingReady: Story = {
  args: { courtsNow: [{ ...mergedCourt, status: 'getting-ready', startedLabel: undefined }] },
}
export const MergedCourtLight: Story = { ...MergedCourt, globals: { theme: 'light' } }
/** Names per the public rule: first names, masked guests as "Y***". */
export const MaskedAndFullNames: Story = { args: { courtsNow: courtsNow.slice(0, 1) } }
/** Visitor: no Courts now (omitted); the Queue slot carries the login line. */
export const VisitorNoCourtsNow: Story = {
  args: {
    queueSlot: (
      <section aria-label="Queue" className="mt-5 flex flex-col gap-3">
        <h2 className="text-lg font-bold">Queue</h2>
        <p className="text-[13px] text-fg2">Log in with ROTRA Player to see the queue.</p>
      </section>
    ),
  },
}
