import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubIdentityCard } from './ClubIdentityCard'

const club = clubs[0]
if (!club) throw new Error('Club fixtures missing')

const meta = {
  title: 'Admin/ClubIdentityCard',
  component: ClubIdentityCard,
  args: { foundingAddress: club.foundingAddress, cityCode: club.cityCode },
} satisfies Meta<typeof ClubIdentityCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** The prototype seeds no earlier names; approving a name change keeps the old one, as here. */
export const WithEarlierNames: Story = { args: { earlierNames: [club.name] } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const WithEarlierNamesLight: Story = { ...WithEarlierNames, globals: { theme: 'light' } }
