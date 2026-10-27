import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import type { ReactNode } from 'react'
import { type NoticeVariants, noticeVariants } from './Notice.variants'

export type NoticeProps = NoticeVariants & {
  /** Bold lead-in, e.g. "Couldn't load the leaderboard." */
  title?: ReactNode
  children?: ReactNode
  /** A button or link that resolves the notice */
  action?: ReactNode
  /** Overrides the tone's icon */
  icon?: IconName
  className?: string
}

const TONE_ICON: Record<NonNullable<NoticeVariants['tone']>, IconName> = {
  info: 'info',
  success: 'check',
  warn: 'alert',
  error: 'alert',
  offline: 'alert',
}

/**
 * The prototypes' .notice: an inline banner with an icon and a message. Announced politely to screen
 * readers (errors assertively) without taking focus.
 */
export function Notice({ tone, title, children, action, icon, className }: NoticeProps) {
  const t = tone ?? 'info'
  return (
    <div
      role={t === 'error' ? 'alert' : 'status'}
      className={cn(noticeVariants({ tone }), className)}
    >
      <Icon name={icon ?? TONE_ICON[t]} className="mt-0.5 flex-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="m-0">
          {title ? <b>{title}</b> : null}
          {title && children ? ' ' : null}
          {children}
        </p>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
