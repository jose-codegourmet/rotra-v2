import type { Meta, StoryObj } from '@storybook/react-vite'
import { CurrentSessionCard } from './CurrentSessionCard'

const meta = {
  title: 'Player/CurrentSessionCard',
  component: CurrentSessionCard,
  args: {
    session: {
      title: 'Thursday Night Smash',
      subtitle: 'Today · 7:00 PM · Cebu Smashers',
      href: '/queue/s/thursday-night-smash',
    },
  },
} satisfies Meta<typeof CurrentSessionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {}
export const None: Story = { args: { session: undefined } }
export const LongTitle: Story = {
  args: {
    session: {
      title: 'Saturday Morning Mixed Doubles Ladder With Visiting Clubs From Across The City',
      subtitle: 'Today · 8:00 AM · Cebu Smashers Badminton Club',
      href: '/queue/s/long',
    },
  },
}
export const LiveLight: Story = { globals: { theme: 'light' } }
export const NoneLight: Story = { ...None, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const NonePhone: Story = { ...None, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
