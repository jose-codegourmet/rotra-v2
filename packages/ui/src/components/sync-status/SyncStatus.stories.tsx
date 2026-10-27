import type { Meta, StoryObj } from '@storybook/react-vite'
import { SyncStatus } from './SyncStatus'

const meta = {
  title: 'Shared/SyncStatus',
  component: SyncStatus,
  args: { state: 'synced', lastSyncedAt: '7:42 PM', onOpen: () => {} },
} satisfies Meta<typeof SyncStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Synced: Story = {}

export const EveryState: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <SyncStatus state="saving" />
      <SyncStatus state="saved-waiting" pending={3} />
      <SyncStatus state="syncing" />
      <SyncStatus state="synced" lastSyncedAt="7:42 PM" />
      <SyncStatus state="needs-attention" />
      <SyncStatus state="failed" />
      <SyncStatus state="offline" pending={3} />
      <SyncStatus state="offline" />
    </div>
  ),
}

export const Phone: Story = { render: EveryState.render, globals: { viewport: { value: 'phone' } } }
