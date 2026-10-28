import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import { RecoveryStatusPanel } from '@rotra/ui/recovery-status-panel'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionRecoveryScreen } from './SessionRecoveryScreen'
const meta = {
  title: 'Queue/SessionRecoveryScreen',
  component: SessionRecoveryScreen,
  args: {
    title: consoleSessionFixture.session.title,
    onBack: fn(),
    children: <RecoveryStatusPanel state="waiting" />,
  },
} satisfies Meta<typeof SessionRecoveryScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Waiting: Story = {}
