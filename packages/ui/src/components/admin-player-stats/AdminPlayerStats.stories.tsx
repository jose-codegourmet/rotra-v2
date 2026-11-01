import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerStats } from './AdminPlayerStats'

const meta = {
  title: 'Admin/AdminPlayerStats',
  component: AdminPlayerStats,
  args: {
    filters: {},
    onChange: () => {},
    stats: { advanced: 3, intermediate: 8, beginner: 5, noRank: 2, registered: 10, unclaimed: 8 },
  },
} satisfies Meta<typeof AdminPlayerStats>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
