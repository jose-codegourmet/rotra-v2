import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerHistory } from './AdminPlayerHistory'

const meta = {
  title: 'Admin/AdminPlayerHistory',
  component: AdminPlayerHistory,
  args: {
    name: 'Alex Reyes',
    backHref: '#',
    sessions: [],
    onRetry: () => {},
    tab: 'counted',
    club: '',
    from: '',
    to: '',
    page: 1,
    onChange: () => {},
  },
} satisfies Meta<typeof AdminPlayerHistory>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
