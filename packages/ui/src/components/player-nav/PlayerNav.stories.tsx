import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerNav } from './PlayerNav'

const noop = () => undefined

const meta = {
  title: 'Player/PlayerNav',
  component: PlayerNav,
  args: {
    signedIn: false,
    current: 'leaderboard',
    leaderboard: { onNavigate: noop },
    signIn: { onNavigate: noop },
    profile: { onNavigate: noop },
  },
} satisfies Meta<typeof PlayerNav>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOutOnLeaderboard: Story = {}

export const SignedInOnMyProfile: Story = { args: { signedIn: true, current: 'profile' } }

export const SignedInOnLeaderboard: Story = { args: { signedIn: true, current: 'leaderboard' } }

export const Phone: Story = {
  ...SignedOutOnLeaderboard,
  globals: { viewport: { value: 'phone' } },
}
