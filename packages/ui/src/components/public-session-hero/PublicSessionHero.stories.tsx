import { clubs } from '@rotra/data/fixtures/clubs'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicSessionHero } from './PublicSessionHero'

const club = clubs[0]
const session = queueSessionFixtures.sessions[0]
if (!club || !session) throw new Error('Club or session fixture missing')

// The prototype's fmtDate / fmtTime: "Sun, Oct 26 · 6:00 PM–9:00 PM".
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const dateLine = `${fmtDate(session.scheduledStartAt)} · ${fmtTime(session.scheduledStartAt)}–${fmtTime(session.scheduledEndAt)}`

const meta = {
  title: 'Queue/PublicSession/PublicSessionHero',
  component: PublicSessionHero,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: {
    dateLine,
    title: session.title,
    clubName: club.name,
    clubInitials: club.initials,
    clubLogoUrl: club.logoUrl,
    state: 'live',
  },
} satisfies Meta<typeof PublicSessionHero>

export default meta
type Story = StoryObj<typeof meta>

/** An active session: the accent "Happening now" chip. */
export const Live: Story = {}

/** A completed session: the neutral "Finished" chip. */
export const Finished: Story = { args: { state: 'finished' } }

/** A prepared session: no chip. */
export const Prepared: Story = { args: { state: 'upcoming' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

export const LongNames: Story = {
  args: {
    title: 'Sunday Night Queue · Open play, all levels welcome, bring a friend',
    clubName: 'Lahug Smash and Shuttle Badminton Association of Cebu',
  },
  globals: { viewport: { value: 'phone' } },
}
