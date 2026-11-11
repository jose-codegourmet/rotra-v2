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

// Tracy, the first sample guest, as typed in the request.
const guest = joinRequests[0]
if (!guest) throw new Error('Join request fixture missing')
const filled = {
  name: guest.name,
  nickname: guest.nickname ?? '',
  phone: '0917 555 0142',
  statedBand: guest.statedBand,
  placement: guest.placement,
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

const playerLoginHref =
  'https://player.rotra.club/login?next=https%3A%2F%2Fqueue.rotra.club%2Fs%2Ftonight%3Fjoin%3D1'

/** Two choices above the form: guest (this form) or ROTRA Player login. Logging in never grants a slot. */
export const WithPlayerLogin: Story = { args: { playerLoginHref } }

/** After the ROTRA Player login: the guest form again, with the "You're back" line. */
export const ReturnedFromLogin: Story = { args: { playerLoginHref, returned: true } }

export const Filled: Story = { args: { defaultValues: filled } }

/** Every slot is taken (D-2026-11-11-02): Join a slot is disabled and Be waitlisted preselected. */
export const SlotsFull: Story = { args: { slotsFull: true, defaultValues: filled } }
export const SlotsFullLight: Story = { ...SlotsFull, globals: { theme: 'light' } }
/** The guest asks to be waitlisted while slots are still open. */
export const WaitlistChosen: Story = {
  args: { defaultValues: { ...filled, placement: 'waitlist' } },
}

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
