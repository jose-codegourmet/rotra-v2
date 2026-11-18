import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'
import type { ElementType } from 'react'

export type NotificationBellProps = {
  unreadCount: number
  current?: boolean
  href?: string
  onNavigate?: () => void
  /** Link component for href targets. */
  linkAs?: ElementType
}

export function NotificationBell({
  unreadCount,
  current,
  href,
  onNavigate,
  linkAs: Link = 'a',
}: NotificationBellProps) {
  const hasUnread = unreadCount > 0
  const content = (
    <>
      <Icon name="bell" />
      {hasUnread ? (
        <Chip
          aria-hidden="true"
          className="absolute -top-1 -right-1 grid box-content h-[18px] min-w-[18px] place-items-center border-2 border-bg bg-error px-[5px] py-0 text-[11px] leading-none font-bold text-on-accent"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Chip>
      ) : null}
    </>
  )

  return (
    <Button
      size="xs"
      variant="ghost"
      asChild={Boolean(href)}
      aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      aria-current={current ? 'page' : undefined}
      className="relative min-w-9 flex-none px-0 touch:min-w-11 touch:px-0"
      onClick={onNavigate}
    >
      {href ? <Link href={href}>{content}</Link> : content}
    </Button>
  )
}
