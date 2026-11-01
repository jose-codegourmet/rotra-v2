import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminAddPlayerForm } from './AdminAddPlayerForm'

const meta = {
  title: 'Admin/AdminAddPlayerForm',
  component: AdminAddPlayerForm,
  args: {
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    clubs: [],
    places: [{ code: 'CEB', name: 'Cebu City' }],
  },
} satisfies Meta<typeof AdminAddPlayerForm>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
