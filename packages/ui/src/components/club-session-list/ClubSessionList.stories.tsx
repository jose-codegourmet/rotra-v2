import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubSessionList } from './ClubSessionList'

const at = (days: number, hour: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.setHours(hour, 0, 0, 0)
}
const row = (id: string, title: string, days: number, hour: number) => ({
  id,
  title,
  startsAt: at(days, hour),
  endsAt: at(days, hour + 3),
  live: false,
  href: '#',
})

const meta = {
  title: 'Player/ClubSessionList',
  component: ClubSessionList,
  args: {
    upcomingCount: 3,
    rest: [
      row('s2', 'Friday Night Smash', 5, 20),
      row('s3', 'Sunday Morning Doubles With A Long Title For Wrapping', 7, 8),
    ],
  },
} satisfies Meta<typeof ClubSessionList>
export default meta
type Story = StoryObj<typeof meta>
export const Several: Story = {}
export const OnlyOne: Story = { args: { upcomingCount: 1, rest: [] } }
export const Empty: Story = { args: { upcomingCount: 0, rest: [] } }
export const SeveralLight: Story = { globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
