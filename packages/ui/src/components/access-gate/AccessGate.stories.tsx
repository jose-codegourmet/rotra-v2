import { clubs } from '@rotra/data/fixtures/clubs'
import { venues } from '@rotra/data/fixtures/venues'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AccessGate, type AccessGateSession } from './AccessGate'

const club = clubs[0]
const venue = venues[0]
if (!club || !venue) throw new Error('Fixtures missing')

// Session fixtures arrive with Q01.11 (#57); until then the live session pairs the fixture venue with
// the Queue prototype's tonight session (Sunday Night Queue, 6:00–9:00 PM).
const today = new Date()
const at = (h: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), h).toISOString()
const liveSession: AccessGateSession = {
  title: 'Sunday Night Queue',
  startsAt: at(18),
  endsAt: at(21),
  venueName: venue.name,
}

const meta = {
  title: 'Queue/AccessGate',
  component: AccessGate,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: {
    clubName: club.name,
    clubInitials: club.initials,
    status: 'expired',
    onContinueActiveSession: fn(),
  },
} satisfies Meta<typeof AccessGate>

export default meta
type Story = StoryObj<typeof meta>

export const Expired: Story = {}
export const ExpiredWithActiveSession: Story = { args: { activeSession: liveSession } }
export const Unverified: Story = { args: { status: 'unverified' } }
export const UnverifiedWithActiveSession: Story = {
  args: { status: 'unverified', activeSession: liveSession },
}

export const LongClubName: Story = {
  args: { clubName: `${clubs[1]?.name ?? ''} of Tagbilaran, Bohol and the Visayas Region` },
  globals: { viewport: { value: 'phone' } },
}

export const Phone: Story = {
  args: { activeSession: liveSession },
  globals: { viewport: { value: 'phone' } },
}
