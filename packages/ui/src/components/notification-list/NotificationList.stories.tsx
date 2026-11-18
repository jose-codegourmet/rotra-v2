import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  NotificationList,
  type NotificationListItem,
  type NotificationListProps,
} from './NotificationList'

const newNotifications: NotificationListItem[] = [
  {
    id: 'ann-google',
    kind: 'announce',
    title: 'Verify your ROTRA account',
    body: 'Connect Google, have your phone on file and use your Google email, by December 31, 2026. 1 of 3 done.',
    timeLabel: 'Just now',
    read: false,
    pinned: true,
  },
  {
    id: 'n1',
    kind: 'session',
    title: "You're in Thursday Open Play",
    body: 'Lahug Smash Club confirmed your spot. Thu · 7:00–10:00 PM.',
    timeLabel: '25 min ago',
    read: false,
  },
  {
    id: 'n2',
    kind: 'invite',
    title: 'Kat invited you to play',
    body: 'Saturday Doubles Night at Mandaue Shuttle Society.',
    timeLabel: '3 h ago',
    read: false,
  },
  {
    id: 'n3',
    kind: 'session',
    title: 'Results are up for Sunday Night Queue',
    body: 'You played 6 games. See how they counted.',
    timeLabel: '20 h ago',
    read: false,
  },
]

const earlierNotifications: NotificationListItem[] = [
  {
    id: 'n4',
    kind: 'session',
    title: "You're on the waitlist for Friday Night Smash",
    body: "You're number 2. We'll tell you if a spot opens.",
    timeLabel: '2 days ago',
    read: true,
  },
  {
    id: 'n5',
    kind: 'rank',
    title: 'Your rank was updated',
    body: 'Your new games are in your rank. Tap to see what changed.',
    timeLabel: '4 days ago',
    read: true,
  },
  {
    id: 'n6',
    kind: 'club',
    title: 'IT Park Badminton Club added you',
    body: "You're in the club's saved players. You can leave from the club page.",
    timeLabel: '9 days ago',
    read: true,
  },
  {
    id: 'n7',
    kind: 'account',
    title: 'Your email change was approved',
    body: 'ROTRA Admin approved the change. Sign in with your new email from now on.',
    timeLabel: '15 days ago',
    read: true,
  },
]

function InteractiveList(args: Extract<NotificationListProps, { filter: string }>) {
  const [filter, setFilter] = useState(args.filter)
  const [openedIds, setOpenedIds] = useState<string[]>([])
  const [allRead, setAllRead] = useState(false)

  const withReadState = (items: readonly NotificationListItem[]) =>
    items.map((item) => ({ ...item, read: item.read || allRead || openedIds.includes(item.id) }))
  const recent = withReadState(args.newNotifications)
  const earlier = withReadState(args.earlierNotifications)
  const unreadCount = [...recent, ...earlier].filter((item) => !item.read).length
  const visible = (items: NotificationListItem[]) =>
    filter === 'unread' ? items.filter((item) => !item.read) : items

  return (
    <NotificationList
      filter={filter}
      unreadCount={unreadCount}
      newNotifications={visible(recent)}
      earlierNotifications={visible(earlier)}
      onFilterChange={setFilter}
      onMarkAllRead={() => setAllRead(true)}
      onOpen={(id) => setOpenedIds((ids) => [...ids, id])}
    />
  )
}

const meta = {
  title: 'Player/NotificationList',
  component: InteractiveList,
  parameters: { layout: 'fullscreen' },
  args: {
    filter: 'all',
    unreadCount: 4,
    newNotifications,
    earlierNotifications,
    onFilterChange: () => {},
    onMarkAllRead: () => {},
    onOpen: () => {},
  },
  render: (args) => <InteractiveList {...args} />,
} satisfies Meta<typeof InteractiveList>

export default meta
type Story = StoryObj<typeof meta>

export const Mixed: Story = {}
export const Unread: Story = { args: { filter: 'unread' } }

export const AllRead: Story = {
  args: {
    unreadCount: 0,
    newNotifications: newNotifications.map((item) => ({ ...item, read: true })),
  },
}

export const AllEmpty: Story = {
  args: { unreadCount: 0, newNotifications: [], earlierNotifications: [] },
}

export const UnreadEmpty: Story = {
  args: { ...AllRead.args, filter: 'unread' },
}

export const Loading: Story = {
  render: () => <NotificationList state={{ kind: 'loading' }} />,
}

export const Failed: Story = {
  render: () => <NotificationList state={{ kind: 'error', retrying: false, onRetry: () => {} }} />,
}

export const Light: Story = { globals: { theme: 'light' } }
