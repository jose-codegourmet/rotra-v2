import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerBulkBar } from './AdminPlayerBulkBar'

const meta = {
  title: 'Admin/AdminPlayerBulkBar',
  component: AdminPlayerBulkBar,
  args: { players: [managementPlayer], onClear: () => {}, onAction: () => {} },
} satisfies Meta<typeof AdminPlayerBulkBar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }

export const Empty: Story = { args: { players: [] } }
export const Offline: Story = { args: { offline: true } }
export const OfflineLight: Story = { ...Offline, globals: { theme: 'light' } }
