import { JOSE_SESSIONS } from '@rotra/data/fixtures/player-games'
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

export const Compact: Story = { args: { variant: 'compact', sessions: JOSE_SESSIONS } }
export const CompactLight: Story = { ...Compact, globals: { theme: 'light' } }
export const CompactEmpty: Story = { args: { variant: 'compact', sessions: [] } }
export const CompactEmptyLight: Story = { ...CompactEmpty, globals: { theme: 'light' } }
export const CompactLoading: Story = { args: { variant: 'compact', sessions: undefined } }
export const CompactLoadingLight: Story = { ...CompactLoading, globals: { theme: 'light' } }
export const CompactError: Story = { args: { variant: 'compact', error: true } }
export const CompactErrorLight: Story = { ...CompactError, globals: { theme: 'light' } }
