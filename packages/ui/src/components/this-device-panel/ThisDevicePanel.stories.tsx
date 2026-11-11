import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
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
    onExport: fn(),
    onImport: fn(),
  },
} satisfies Meta<typeof ThisDevicePanel>

export default meta
type Story = StoryObj<typeof meta>

/** Downloads present: Export play history and Import play history… both enabled. */
export const WithSessions: Story = {}
/** No downloads: Export play history disabled, Import play history… still enabled. */
export const Empty: Story = { args: { downloaded: [] } }
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
