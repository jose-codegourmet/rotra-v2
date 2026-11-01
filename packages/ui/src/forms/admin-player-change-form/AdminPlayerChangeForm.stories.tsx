import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerChangeForm } from './AdminPlayerChangeForm'

const meta = {
  title: 'Admin/AdminPlayerChangeForm',
  component: AdminPlayerChangeForm,
  args: {
    players: [managementPlayer],
    action: 'archive',
    open: true,
    onClose: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof AdminPlayerChangeForm>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
