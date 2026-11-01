import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerQuickView } from './AdminPlayerQuickView'

const meta = {
  title: 'Admin/AdminPlayerQuickView',
  component: AdminPlayerQuickView,
  args: {
    open: true,
    onClose: () => {},
    player: managementPlayer,
    createdBy: 'Created by Admin',
    pendingRequests: 0,
    sessions: [],
    profileHref: '#',
    historyHref: '#',
    onRetry: () => {},
    onRetryGames: () => {},
    onCopyId: () => {},
  },
} satisfies Meta<typeof AdminPlayerQuickView>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
