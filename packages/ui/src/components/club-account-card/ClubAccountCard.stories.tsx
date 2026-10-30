import { adminClubOverviews } from '@rotra/data/fixtures/admin-clubs'
import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubAccountCard } from './ClubAccountCard'

const club = clubs[0]
const overview = adminClubOverviews.find((row) => row.id === club?.id)
if (!club || !overview) throw new Error('Club fixtures missing')

const meta = {
  title: 'Admin/ClubAccountCard',
  component: ClubAccountCard,
  args: { username: club.username, setUpOn: overview.setUpOn },
} satisfies Meta<typeof ClubAccountCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
