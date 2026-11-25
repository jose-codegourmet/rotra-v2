import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusPill } from './StatusPill'

const meta = {
  title: 'Queue/StatusPill',
  component: StatusPill,
  args: { status: { kind: 'wait', minutes: 2 } },
} satisfies Meta<typeof StatusPill>

export default meta
type Story = StoryObj<typeof meta>

export const Wait: Story = {}
/** 10–15 minutes: warning */
export const WaitWarning: Story = { args: { status: { kind: 'wait', minutes: 12 } } }
/** 16 minutes and over: error; an hour and over reads "1h 5m" */
export const WaitLong: Story = { args: { status: { kind: 'wait', minutes: 65 } } }
export const InQueue: Story = { args: { status: { kind: 'queued', minutes: 4 } } }
/** Hover shows "Playing on Court 1" */
export const Playing: Story = {
  args: { status: { kind: 'playing', minutes: 1, courtLabel: 'Court 1' } },
}
export const GettingReady: Story = { args: { status: { kind: 'ready', courtLabel: 'Court 2' } } }
export const Away: Story = { args: { status: { kind: 'away' } } }

/** Every state side by side, as they read on the cards and under the queue faces */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['md', 'sm'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-2">
          <StatusPill size={size} status={{ kind: 'wait', minutes: 2 }} />
          <StatusPill size={size} status={{ kind: 'wait', minutes: 12 }} />
          <StatusPill size={size} status={{ kind: 'queued', minutes: 18 }} />
          <StatusPill size={size} status={{ kind: 'queued', minutes: 1500 }} />
          <StatusPill size={size} status={{ kind: 'playing', minutes: 7, courtLabel: 'Court 1' }} />
          <StatusPill size={size} status={{ kind: 'ready', courtLabel: 'Court 2' }} />
          <StatusPill size={size} status={{ kind: 'away' }} />
        </div>
      ))}
    </div>
  ),
}
export const AllStatesLight: Story = { ...AllStates, globals: { theme: 'light' } }
