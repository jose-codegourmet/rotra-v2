import { adminClubRows } from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubPriceTag } from './ClubPriceTag'

const paid = adminClubRows.find((club) => club.pricing === 'paid')
const free = adminClubRows.find((club) => club.pricing === 'free')
if (!paid || !free) throw new Error('Club fixtures missing')

const meta = {
  title: 'Admin/ClubPriceTag',
  component: ClubPriceTag,
  args: { pricing: paid.pricing, monthlyMinor: paid.monthlyMinor },
} satisfies Meta<typeof ClubPriceTag>

export default meta
type Story = StoryObj<typeof meta>

export const Paid: Story = {}
export const Free: Story = { args: { pricing: free.pricing, monthlyMinor: free.monthlyMinor } }

const all = (
  <div className="flex flex-col items-start gap-2">
    {adminClubRows.map((club) => (
      <ClubPriceTag key={club.id} pricing={club.pricing} monthlyMinor={club.monthlyMinor} />
    ))}
  </div>
)
export const EveryClub: Story = { render: () => all }
export const Light: Story = { render: () => all, globals: { theme: 'light' } }
export const Phone: Story = { render: () => all, globals: { viewport: { value: 'phone' } } }
