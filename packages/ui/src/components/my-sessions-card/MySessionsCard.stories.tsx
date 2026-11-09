import type { Meta, StoryObj } from '@storybook/react-vite'
import { MySessionsCard } from './MySessionsCard'

const meta = {
  title: 'Player/MySessionsCard',
  component: MySessionsCard,
  args: {
    sessions: [
      {
        id: 's1',
        title: 'Friday Night Queue',
        subtitle: 'Nov 10 · 8–11 PM · Lahug Smash Club',
        href: '/s/friday',
        status: 'live',
      },
      {
        id: 's2',
        title: 'Sunday Queue',
        subtitle: 'Nov 12 · 8–11 PM · Lahug Smash Club',
        href: '/s/sunday',
        status: 'confirmed',
      },
      {
        id: 's3',
        title: 'Weekend Queue',
        subtitle: 'Nov 13 · 8–11 PM · Cebu Badminton Club',
        href: '/s/weekend',
        status: 'waitlist',
        waitlistPosition: 2,
      },
      {
        id: 's4',
        title: 'Requested session',
        subtitle: 'Nov 14 · 8–11 PM · Cebu Badminton Club',
        href: '/s/requested',
        status: 'requested',
      },
    ],
    finished: [
      { id: 's0', title: 'Last Sunday', subtitle: 'Nov 8 · Lahug Smash Club', published: true },
      {
        id: 's00',
        title: 'Not shared session',
        subtitle: 'Nov 7 · Lahug Smash Club',
        published: false,
      },
    ],
  },
} satisfies Meta<typeof MySessionsCard>
export default meta
type Story = StoryObj<typeof meta>
export const AllStatuses: Story = { args: {} }
export const Empty: Story = { args: { sessions: [], finished: [] } }
export const ShareResult: Story = { args: { onShareResult: () => {} } }
export const LongTitle: Story = {
  args: {
    sessions: [
      {
        id: 's1',
        title: 'An unusually long session title that wraps comfortably on phones',
        subtitle: 'Nov 10 · 8–11 PM · Lahug Smash Club',
        href: '/s/friday',
        status: 'confirmed',
      },
    ],
  },
}
