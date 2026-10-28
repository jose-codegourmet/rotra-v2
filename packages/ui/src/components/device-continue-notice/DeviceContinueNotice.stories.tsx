import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { DeviceContinueNotice } from './DeviceContinueNotice'

const meta = {
  title: 'Queue/DeviceContinueNotice',
  component: DeviceContinueNotice,
  args: {
    sessionTitle: consoleSessionFixture.session.title,
    snapshotAt: consoleSessionFixture.session.scheduledStartAt,
  },
} satisfies Meta<typeof DeviceContinueNotice>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
