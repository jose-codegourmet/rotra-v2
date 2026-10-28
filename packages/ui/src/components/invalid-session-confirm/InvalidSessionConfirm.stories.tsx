import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { Sheet } from '@rotra/ui/sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InvalidSessionConfirm } from './InvalidSessionConfirm'

// Tuesday Drills: the prototype's invalid session record.
const invalid = queueSessionFixtures.sessions.find((s) => s.state === 'invalid')
if (!invalid) throw new Error('Invalid session fixture missing')

const DATE = new Intl.DateTimeFormat('en-PH', { weekday: 'short', day: 'numeric', month: 'short' })
const TIME = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
const when = `${DATE.format(invalid.scheduledStartAt)} · ${TIME.format(invalid.scheduledStartAt)}`

const meta = {
  title: 'Queue/InvalidSessionConfirm',
  component: InvalidSessionConfirm,
  args: {
    sessionTitle: invalid.title,
    when,
    reason: invalid.invalidReason ?? '',
    onConfirm: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <Sheet open onOpenChange={() => {}} title="No official session outcome">
        <Story />
      </Sheet>
    ),
  ],
} satisfies Meta<typeof InvalidSessionConfirm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pending: Story = { args: { isPending: true } }

export const LongReason: Story = {
  name: 'Long reason',
  args: {
    reason:
      'Records from the second device stop after Match 9 and never reached the server. The original device was reported lost at the venue, and its last upload was before the session started, so the games it recorded cannot be recovered or checked against anything.',
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
