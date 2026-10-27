import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClashNotice } from './ClashNotice'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const when = `${time(tonight.scheduledStartAt)}–${time(tonight.scheduledEndAt)}`

const meta = {
  title: 'Queue/ClashNotice',
  component: ClashNotice,
  args: {
    text: `Venue clash: ${tonight.venueName} is already booked for ${tonight.title}, ${when}`,
    sessionId: tonight.id,
    onView: fn(),
  },
} satisfies Meta<typeof ClashNotice>

export default meta
type Story = StoryObj<typeof meta>

export const VenueClash: Story = {}
export const TimeClash: Story = {
  args: { text: `Time clash: ${tonight.title} runs ${when} at ${tonight.venueName}` },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
