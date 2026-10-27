import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { InvalidSessionNotice } from './InvalidSessionNotice'

// Tuesday Drills: the prototype's invalid session record.
const invalid = queueSessionFixtures.sessions.find((s) => s.state === 'invalid')
if (!invalid) throw new Error('Invalid session fixture missing')

const meta = {
  title: 'Queue/InvalidSessionNotice',
  component: InvalidSessionNotice,
  args: { variant: 'results', reason: invalid.invalidReason ?? undefined },
  argTypes: { variant: { control: 'inline-radio', options: ['results', 'night'] } },
} satisfies Meta<typeof InvalidSessionNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Results: Story = {}

export const Night: Story = { args: { variant: 'night' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
