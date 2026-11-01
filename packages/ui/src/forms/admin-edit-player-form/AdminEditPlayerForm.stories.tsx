import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminEditPlayerForm } from './AdminEditPlayerForm'

const meta = {
  title: 'Admin/AdminEditPlayerForm',
  component: AdminEditPlayerForm,
  args: {
    player: managementPlayer,
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    onReload: () => {},
  },
} satisfies Meta<typeof AdminEditPlayerForm>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
