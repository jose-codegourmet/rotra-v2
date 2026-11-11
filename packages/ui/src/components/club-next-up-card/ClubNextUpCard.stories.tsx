import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubNextUpCard } from './ClubNextUpCard'

const at = (days: number, hour: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.setHours(hour, 0, 0, 0)
}

const meta = {
  title: 'Player/ClubNextUpCard',
  component: ClubNextUpCard,
  args: {
    title: 'Thursday Open Play',
    startsAt: at(2, 19),
    endsAt: at(2, 22),
    live: false,
    href: '#',
  },
} satisfies Meta<typeof ClubNextUpCard>
export default meta
type Story = StoryObj<typeof meta>
export const NextUp: Story = {}
export const HappeningNow: Story = {
  args: { title: 'Sunday Night Queue', startsAt: at(0, 18), endsAt: at(0, 21), live: true },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const NextUpLight: Story = { globals: { theme: 'light' } }
export const HappeningNowLight: Story = { ...HappeningNow, globals: { theme: 'light' } }
