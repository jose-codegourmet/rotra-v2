import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerActions } from './AdminPlayerActions'

const meta = {
  title: 'Admin/AdminPlayerActions',
  component: AdminPlayerActions,
  args: { player: managementPlayer, onAction: () => {} },
} satisfies Meta<typeof AdminPlayerActions>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
