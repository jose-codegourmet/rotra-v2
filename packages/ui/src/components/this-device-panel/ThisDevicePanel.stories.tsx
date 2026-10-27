import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThisDevicePanel } from './ThisDevicePanel'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const meta = {
  title: 'Queue/ThisDevicePanel',
  component: ThisDevicePanel,
  args: {
    downloaded: [
      { sessionId: tonight.id, title: tonight.title, startsAt: tonight.scheduledStartAt },
    ],
  },
} satisfies Meta<typeof ThisDevicePanel>

export default meta
type Story = StoryObj<typeof meta>

export const WithSessions: Story = {}
export const Empty: Story = { args: { downloaded: [] } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
