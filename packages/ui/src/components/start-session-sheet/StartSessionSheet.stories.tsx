import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StartSessionSheet } from './StartSessionSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const meta = {
  title: 'Queue/StartSessionSheet',
  component: StartSessionSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: tonight.title,
    courts: 3,
    formatsLabel: 'Doubles',
    modeLabel: 'Fair',
    minimumGames: tonight.minimumGames,
    rosterCount: 14,
    presentCount: 10,
    waitlistCount: 2,
    onConfirm: fn(),
  },
} satisfies Meta<typeof StartSessionSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Online: Story = {}
export const Offline: Story = { args: { offline: true } }
export const Pending: Story = { args: { isPending: true } }
export const Refused: Story = {
  args: { error: 'Thursday Open Play is already running. One session at a time.' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
