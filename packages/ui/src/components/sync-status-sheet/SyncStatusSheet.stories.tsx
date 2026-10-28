import { pendingSyncChanges, syncedChangesFixture } from '@rotra/data/fixtures/sync-recovery'
import { SyncAttentionNotice } from '@rotra/ui/sync-attention-notice'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SyncStatusSheet } from './SyncStatusSheet'

const meta = {
  title: 'Queue/SyncStatusSheet',
  component: SyncStatusSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    status: 'online',
    pendingChanges: [],
    syncedChanges: syncedChangesFixture,
    lastSyncedAt: syncedChangesFixture[0]!.at,
  },
} satisfies Meta<typeof SyncStatusSheet>
export default meta
type Story = StoryObj<typeof meta>
export const OnlineAndSynced: Story = {}
export const Syncing: Story = { args: { status: 'syncing', pendingChanges: pendingSyncChanges } }
export const OfflineWithGroups: Story = {
  args: { status: 'offline', pendingChanges: pendingSyncChanges },
}
export const OfflineNothingWaiting: Story = { args: { status: 'offline', syncedChanges: [] } }
export const WithIncompleteNotice: Story = {
  args: { incomplete: true, attention: <SyncAttentionNotice variant="incomplete" /> },
}
