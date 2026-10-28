import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StartSessionBar } from './StartSessionBar'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const meta = {
  title: 'Queue/StartSessionBar',
  component: StartSessionBar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="min-h-[200px]">
        <Story />
      </div>
    ),
  ],
  args: { blocker: null, rosterCount: 17, presentCount: 13, onStart: fn() },
} satisfies Meta<typeof StartSessionBar>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}
export const LevelsMissing: Story = {
  args: { blocker: '1 player needs a level before you can start.' },
}
export const AnotherSessionLive: Story = {
  args: {
    blocker: `${tonight.title} is already running. One session at a time.`,
    otherLive: { title: tonight.title, onOpen: fn() },
  },
}
export const NoDownloadOffline: Story = {
  args: { blocker: 'No downloaded copy on this device. Connect, or download first.' },
}
export const LicenseEnded: Story = {
  args: { blocker: 'Your license has ended, so new sessions can’t start.' },
}
export const PhoneBlocked: Story = {
  args: LevelsMissing.args,
  globals: { viewport: { value: 'phone' } },
}
