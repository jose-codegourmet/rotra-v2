import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ProfileRankingCard } from './ProfileRankingCard'

const meta = {
  title: 'Player/ProfileRankingCard',
  component: ProfileRankingCard,
  args: {
    levelLabel: 'Intermediate High',
    status: { label: 'On the leaderboard', tone: 'accent' },
    position: 128,
    total: 1204,
    recentCount: 14,
    matchRequirement: 10,
    onShare: fn(),
    onOpenRankDetail: fn(),
    onOpenLeaderboard: fn(),
  },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof ProfileRankingCard>
export default meta
type Story = StoryObj<typeof meta>

/** Your own profile: Share shows */
export const Own: Story = {}
export const OwnLight: Story = { globals: { theme: 'light' } }
/** Someone else's profile: no Share */
export const SomeoneElse: Story = { args: { onShare: undefined } }
export const TopThree: Story = { args: { position: 2, levelLabel: 'Advanced High' } }
export const LastPlace: Story = { args: { position: 1204 } }
export const Updating: Story = { args: { status: { label: 'Updating', tone: 'warn' } } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
