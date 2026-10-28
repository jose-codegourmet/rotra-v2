import { joinRequests } from '@rotra/data/fixtures/joinRequests'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { JoinRequestCard, type JoinRequestCardProps } from './JoinRequestCard'

// Tonight's prepared session: 8 players per court × 3 courts, 14 on the roster.
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const capacity =
  tonight.playersPerCourt *
  queueSessionFixtures.courts.filter((c) => c.sessionId === tonight.id).length
const openSlots = capacity - queueSessionFixtures.roster.length

// The first sample guest who sent a request from the session link.
const guest = joinRequests[0]
if (!guest) throw new Error('Join request fixture missing')

const meta = {
  title: 'Queue/JoinRequestCard',
  component: JoinRequestCard,
  decorators: [
    (Story) => (
      <div className="max-w-[640px]">
        <Story />
      </div>
    ),
  ],
  args: { variant: 'open', openSlots, capacity, onRequestToJoin: fn() },
} satisfies Meta<JoinRequestCardProps>

export default meta
type Story = StoryObj<JoinRequestCardProps>

/** "N of M slots open." with Request to join. */
export const Open: Story = {}

/** Every slot is taken: confirmed guests join the waitlist; Request to join stays. */
export const Full: Story = { args: { variant: 'full', onRequestToJoin: fn() } }

/** Accept join requests is off for this session. */
export const Off: Story = { args: { variant: 'off' } }

/** This visitor's request is waiting for the Queue Master. */
export const Sent: Story = { args: { variant: 'sent', name: guest.name } }

export const ConfirmedSlot: Story = { args: { variant: 'confirmed-slot' } }

export const ConfirmedWaitlist: Story = {
  args: { variant: 'confirmed-waitlist', waitlistPosition: 2 },
}

export const Declined: Story = { args: { variant: 'declined' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
