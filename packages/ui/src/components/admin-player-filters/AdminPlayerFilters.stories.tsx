import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerFilters } from './AdminPlayerFilters'

const meta = {
  title: 'Admin/AdminPlayerFilters',
  component: AdminPlayerFilters,
  args: { filters: {}, places: [], onChange: () => {}, onClear: () => {} },
} satisfies Meta<typeof AdminPlayerFilters>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
