import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'

const NOTIFICATION_KINDS = {
  announce: { icon: 'announcement', label: 'ROTRA' },
  session: { icon: 'court', label: 'Sessions' },
  invite: { icon: 'mail', label: 'Invites' },
  club: { icon: 'members', label: 'Clubs' },
  rank: { icon: 'trophy', label: 'Rank' },
  account: { icon: 'shield', label: 'Account' },
} satisfies Record<string, { icon: IconName; label: string }>

export type NotificationKind = keyof typeof NOTIFICATION_KINDS

export type NotificationItemProps = {
  kind: NotificationKind
  title: string
  body: string
  timeLabel: string
  read: boolean
  pinned?: boolean
  onOpen: () => void
}

export function NotificationItem({
  kind,
  title,
  body,
  timeLabel,
  read,
  pinned,
  onOpen,
}: NotificationItemProps) {
  const { icon, label } = NOTIFICATION_KINDS[kind]
  const announcement = kind === 'announce'

  return (
    <button
      type="button"
      className={cn(
        'flex min-h-11 w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left text-[15px] text-fg focus-visible:outline-offset-[-2px]',
        announcement && 'bg-ann-bg inset-shadow-[1px_0_0_var(--ann-border)]',
        !announcement && (read ? 'hover:bg-elev' : 'bg-accent-subtle'),
      )}
      onClick={onOpen}
    >
      <span
        className={cn(
          'grid size-9 flex-none place-items-center rounded-full',
          announcement && 'bg-surface text-ann-tag',
          !announcement && (read ? 'bg-elev text-fg2' : 'bg-surface text-accent-dim'),
        )}
      >
        <Icon name={icon} size={18} strokeWidth={2.2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] text-fg2">
          {label}
          {pinned ? ' · Pinned' : null}
        </span>
        <b className="wrap-anywhere">{title}</b>
        <span className="truncate text-[13px] text-fg2">{body}</span>
      </span>
      <span className="flex flex-none flex-col items-end gap-1.5">
        <span className="text-[12px] whitespace-nowrap text-fg3">
          {pinned ? 'Until done' : timeLabel}
        </span>
        {read ? null : (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'mt-1.5 size-2 rounded-full',
                announcement ? 'bg-ann-border' : 'bg-accent',
              )}
            />
            <span className="sr-only">Unread</span>
          </>
        )}
      </span>
    </button>
  )
}
