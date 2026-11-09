import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MyNightCard } from './MyNightCard'

const meta = {
  title: 'Queue/MyNightCard',
  component: MyNightCard,
  args: {
    stage: 'live-present',
    games: 3,
    won: 2,
    lost: 1,
    minimum: 6,
    queuePosition: 3,
    matchLabel: 'with Ana vs Ben, Cy',
    matchHistoryHref: '#match-history',
    onCheckIn: fn(),
    onLeave: fn(),
    onCantMakeIt: fn(),
    onRequestMatch: fn(),
    onCancelMatchRequest: fn(),
    onInvite: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MyNightCard>

export default meta
type Story = StoryObj<typeof meta>

export const BelowMinimum: Story = {}

export const AtMinimum: Story = { args: { games: 6, won: 4, lost: 2 } }

export const AboveMinimum: Story = { args: { games: 7, won: 4, lost: 3 } }

export const NoMinimum: Story = { args: { minimum: 0, games: 2, won: 1, lost: 1 } }

export const NotInAQueuedMatch: Story = {
  args: { queuePosition: undefined, matchLabel: undefined },
}

export const OnCourt: Story = { args: { courtLabel: 'Court 2' } }

export const MatchRequestSent: Story = { args: { matchRequestOpen: true } }

export const CheckedInOnline: Story = { args: { checkedIn: true } }

export const CheckedInOffline: Story = { args: { checkedIn: true, offline: true } }

/** Offline: only I'm here works; the other writes are disabled with the offline tooltip */
export const OfflineWritesDisabled: Story = {
  args: { checkedIn: true, offline: true, matchRequestOpen: true },
}

export const NotPresent: Story = { args: { stage: 'live-not-present' } }

export const Left: Story = { args: { stage: 'live-not-present', hasLeft: true } }

export const SelfCheckInOff: Story = {
  args: { stage: 'live-not-present', selfCheckInOff: true },
}

export const BeforeStart: Story = {
  args: { stage: 'before-start', startsLabel: 'Nov 9, 7:30 PM', canInvite: true },
}

export const BeforeStartNoticeSent: Story = {
  args: {
    stage: 'before-start',
    startsLabel: 'Nov 9, 7:30 PM',
    cantMakeItSent: true,
    canInvite: true,
  },
}

export const Waitlisted: Story = {
  args: { stage: 'waitlisted', waitlistPosition: 2, canInvite: true },
}

export const WaitlistedLive: Story = { args: { stage: 'waitlisted', waitlistPosition: 2 } }

export const Finished: Story = { args: { stage: 'finished', games: 7, won: 4, lost: 3 } }

export const Phone: Story = {
  args: { courtLabel: 'Court 2' },
  globals: { viewport: { value: 'phone' } },
}

export const Narrow420: Story = {
  decorators: [
    (Story) => (
      <div className="w-[420px]">
        <Story />
      </div>
    ),
  ],
}

export const CheckedInOfflineLight: Story = {
  args: { checkedIn: true, offline: true },
  globals: { theme: 'light' },
}

export const FinishedLight: Story = {
  args: { stage: 'finished', games: 7, won: 4, lost: 3 },
  globals: { theme: 'light' },
}
