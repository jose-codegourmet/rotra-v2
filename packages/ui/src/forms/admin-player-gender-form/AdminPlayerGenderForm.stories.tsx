import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerGenderForm } from './AdminPlayerGenderForm'

const meta = {
  title: 'Admin/AdminPlayerGenderForm',
  component: AdminPlayerGenderForm,
  args: {
    players: [managementPlayer],
    open: true,
    onClose: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof AdminPlayerGenderForm>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const Offline: Story = { args: { offline: true } }
export const PartialFailure: Story = {
  args: {
    results: [
      {
        id: managementPlayer.id,
        name: managementPlayer.name,
        success: false,
        error: 'Could not save.',
      },
    ],
  },
}
export const PartialFailureLight: Story = { ...PartialFailure, globals: { theme: 'light' } }
