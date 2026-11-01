import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerPagination } from './PlayerPagination'

const meta = {
  title: 'Admin/PlayerPagination',
  component: PlayerPagination,
  args: { page: 2, pageCount: 5, pageSize: 25, total: 110, onPage: () => {} },
} satisfies Meta<typeof PlayerPagination>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
