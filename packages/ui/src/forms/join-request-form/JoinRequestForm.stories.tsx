import { joinRequests } from '@rotra/data/fixtures/joinRequests'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { JoinRequestForm } from './JoinRequestForm'

// Tonight's prepared session, written the way the prototype's Request to join sheet does.
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const formatDate = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const sessionLine = `${tonight.title} · ${formatDate(tonight.scheduledStartAt)}, ${formatTime(tonight.scheduledStartAt)} · ${tonight.venueName}`

// Rico, the first sample guest, as he typed his request.
const guest = joinRequests[0]
if (!guest) throw new Error('Join request fixture missing')
const filled = {
  name: guest.name,
  nickname: guest.nickname ?? '',
  phone: '0917 555 0142',
  statedBand: guest.statedBand,
}

const meta = {
  title: 'Queue/JoinRequestForm',
  component: JoinRequestForm,
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
  args: { sessionLine, onSubmit: fn(), onCancel: fn() },
} satisfies Meta<typeof JoinRequestForm>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

/** Sending with nothing filled in and a short phone shows every field error next to its field. */
export const ValidationErrors: Story = {
  args: { defaultValues: { phone: '0917 55' } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Send request' }))
  },
}

export const Filled: Story = { args: { defaultValues: filled } }

export const Pending: Story = { args: { isPending: true, defaultValues: filled } }

export const ServerError: Story = {
  args: {
    serverError: "Couldn't send your request. Check your connection and try again.",
    defaultValues: filled,
  },
}

export const Phone: Story = {
  args: { defaultValues: filled },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { defaultValues: filled },
  globals: { viewport: { value: 'desktop' } },
}
