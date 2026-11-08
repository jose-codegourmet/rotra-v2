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

export const Directory: Story = {
  args: { variant: 'directory', page: 6, pageCount: 12, total: 300, onPageSize: () => {} },
}
export const DirectoryLight: Story = { ...Directory, globals: { theme: 'light' } }
export const FirstPage: Story = { args: { ...Directory.args, page: 1 } }
export const FirstPageLight: Story = { ...FirstPage, globals: { theme: 'light' } }
export const LastPage: Story = { args: { ...Directory.args, page: 12 } }
export const LastPageLight: Story = { ...LastPage, globals: { theme: 'light' } }
export const Empty: Story = { args: { ...Directory.args, page: 1, pageCount: 1, total: 0 } }
