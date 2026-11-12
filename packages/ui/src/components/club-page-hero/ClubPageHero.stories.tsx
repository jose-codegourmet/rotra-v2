import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubPageHero } from './ClubPageHero'

const inDays = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.setHours(19, 0, 0, 0)
}

const meta = {
  title: 'Player/ClubPageHero',
  component: ClubPageHero,
  args: {
    name: 'Lahug Smash Club',
    initials: 'LS',
    city: 'Cebu City',
    memberCount: 320,
    membersShown: 12,
    upcomingCount: 3,
    next: { live: false, startsAt: inDays(2) },
    monthCount: 9,
    monthDone: 6,
    joinHref: '#',
    onShare: fn(),
  },
} satisfies Meta<typeof ClubPageHero>
export default meta
type Story = StoryObj<typeof meta>
export const Scheduled: Story = {}
export const PlayingNow: Story = { args: { next: { live: true, startsAt: inDays(0) } } }
export const NothingScheduled: Story = {
  args: {
    name: 'Talamban Racket Club',
    initials: 'TR',
    memberCount: 0,
    membersShown: 0,
    upcomingCount: 0,
    next: null,
    monthCount: 0,
    monthDone: 0,
  },
}
export const Member: Story = { args: { onLeave: fn() } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const ScheduledLight: Story = { globals: { theme: 'light' } }
export const PlayingNowLight: Story = { ...PlayingNow, globals: { theme: 'light' } }
export const MemberLight: Story = { ...Member, globals: { theme: 'light' } }
