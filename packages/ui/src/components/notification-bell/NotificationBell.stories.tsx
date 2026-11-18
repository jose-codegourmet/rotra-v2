import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotificationBell } from './NotificationBell'

const meta = {
  title: 'Player/NotificationBell',
  component: NotificationBell,
  args: { unreadCount: 0, onNavigate: () => {} },
} satisfies Meta<typeof NotificationBell>

export default meta
type Story = StoryObj<typeof meta>

export const NoneUnread: Story = {}
export const FewUnread: Story = { args: { unreadCount: 4 } }
export const MoreThanNine: Story = { args: { unreadCount: 12 } }
export const Current: Story = { args: { unreadCount: 4, current: true } }
export const Light: Story = { args: { unreadCount: 4 }, globals: { theme: 'light' } }
