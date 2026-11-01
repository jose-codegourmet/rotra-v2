import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerClubs } from './AdminPlayerClubs'

const meta = {
  title: 'Admin/AdminPlayerClubs',
  component: AdminPlayerClubs,
  args: { clubs: [] },
} satisfies Meta<typeof AdminPlayerClubs>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
