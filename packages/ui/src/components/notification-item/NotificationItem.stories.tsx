import { Card } from '@rotra/ui/card'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotificationItem } from './NotificationItem'

const meta = {
  title: 'Player/NotificationItem',
  component: NotificationItem,
  decorators: [
    (Story) => (
      <Card padding="none" className="mx-auto max-w-[608px] overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  args: {
    kind: 'session',
    title: "You're in Thursday Open Play",
    body: 'Lahug Smash Club confirmed your spot. Thu · 7:00–10:00 PM.',
    timeLabel: '25 min ago',
    read: false,
    onOpen: () => {},
  },
} satisfies Meta<typeof NotificationItem>

export default meta
type Story = StoryObj<typeof meta>

export const SessionUnread: Story = {}
export const SessionRead: Story = { args: { read: true } }

export const PinnedAnnouncement: Story = {
  args: {
    kind: 'announce',
    title: 'Verify your ROTRA account',
    body: 'Connect Google, have your phone on file and use your Google email, by December 31, 2026. 1 of 3 done.',
    timeLabel: 'Just now',
    pinned: true,
  },
}

export const PinnedAnnouncementRead: Story = {
  args: { ...PinnedAnnouncement.args, read: true },
}

export const Invite: Story = {
  args: {
    kind: 'invite',
    title: 'Kat invited you to play',
    body: 'Saturday Doubles Night at Mandaue Shuttle Society.',
    timeLabel: '3 h ago',
  },
}

export const Club: Story = {
  args: {
    kind: 'club',
    title: 'IT Park Badminton Club added you',
    body: "You're in the club's saved players. You can leave from the club page.",
    timeLabel: '9 days ago',
    read: true,
  },
}

export const Rank: Story = {
  args: {
    kind: 'rank',
    title: 'Your rank was updated',
    body: 'Your new games are in your rank. Tap to see what changed.',
    timeLabel: '4 days ago',
    read: true,
  },
}

export const Account: Story = {
  args: {
    kind: 'account',
    title: 'Your email change was approved',
    body: 'ROTRA Admin approved the change. Sign in with your new email from now on.',
    timeLabel: '15 days ago',
    read: true,
  },
}

export const Light: Story = {
  args: PinnedAnnouncement.args,
  globals: { theme: 'light' },
}
