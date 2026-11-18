import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import { Icon } from '@rotra/ui/icon'
import { NotificationItem, type NotificationItemProps } from '@rotra/ui/notification-item'
import { SegmentedControl } from '@rotra/ui/segmented-control'

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
]

export type NotificationFilter = 'all' | 'unread'

export type NotificationListItem = Omit<NotificationItemProps, 'onOpen'> & {
  id: string
}

export type NotificationListProps = {
  filter: NotificationFilter
  /** Total unread across both groups regardless of the selected filter. */
  unreadCount: number
  /** The pinned announcements and items from the last 24 hours, in display order. */
  newNotifications: readonly NotificationListItem[]
  earlierNotifications: readonly NotificationListItem[]
  onFilterChange: (filter: NotificationFilter) => void
  onMarkAllRead: () => void
  onOpen: (id: string) => void
}

function NotificationGroup({
  title,
  items,
  onOpen,
}: {
  title: 'New' | 'Earlier'
  items: readonly NotificationListItem[]
  onOpen: NotificationListProps['onOpen']
}) {
  if (!items.length) return null

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[12px] font-semibold tracking-[0.5px] text-fg2 uppercase">{title}</h2>
      <Card padding="none" asChild>
        <ul className="divide-y divide-border overflow-hidden">
          {items.map(({ id, ...item }) => (
            <li key={id}>
              <NotificationItem {...item} onOpen={() => onOpen(id)} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}

export function NotificationList({
  filter,
  unreadCount,
  newNotifications,
  earlierNotifications,
  onFilterChange,
  onMarkAllRead,
  onOpen,
}: NotificationListProps) {
  const empty = !newNotifications.length && !earlierNotifications.length

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px] pl-[max(16px,env(safe-area-inset-left,0px))] text-[15px]">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.3px]">
          Notifications
        </h1>
        <p className="text-fg2">
          {unreadCount ? `${unreadCount} unread` : "You're all caught up."}
        </p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Show"
          className="gap-1.5"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => onFilterChange(value === 'unread' ? 'unread' : 'all')}
        />
        <Button size="xs" variant="ghost" disabled={!unreadCount} onClick={onMarkAllRead}>
          Mark all as read
        </Button>
      </div>
      {empty ? (
        <Card padding="none" className="flex flex-col items-center gap-3 px-4 py-8">
          <span className="grid size-12 place-items-center rounded-full bg-elev text-fg2">
            <Icon name="bell" />
          </span>
          <EmptyState
            className="gap-3 p-0 text-[13px]"
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          >
            Session updates, invites, club changes and messages from ROTRA show up here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <NotificationGroup title="New" items={newNotifications} onOpen={onOpen} />
          <NotificationGroup title="Earlier" items={earlierNotifications} onOpen={onOpen} />
        </>
      )}
      <p className="text-[13px] text-fg2">
        Notifications stay for 90 days. Prototype: in the app only, no phone or email alerts yet.
      </p>
    </main>
  )
}
