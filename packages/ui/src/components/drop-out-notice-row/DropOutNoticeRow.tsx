import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'

export type DropOutNoticeRowProps = {
  name: string
  photoUrl?: string
  timeLabel: string
  onRemove: () => void
  onKeep: () => void
  isPending?: boolean
  error?: ReactNode
}

export function DropOutNoticeRow({
  name,
  photoUrl,
  timeLabel,
  onRemove,
  onKeep,
  isPending = false,
  error,
}: DropOutNoticeRowProps) {
  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} src={photoUrl} />
        <div className="min-w-0 flex-1">
          <b className="[overflow-wrap:anywhere]">{name}</b>
          <p className="m-0 text-[13px] text-fg2">Says they can't make it · {timeLabel}</p>
        </div>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={onRemove}>
          Remove from roster
        </Button>
        <Button size="sm" disabled={isPending} onClick={onKeep}>
          Keep
        </Button>
      </div>
    </div>
  )
}
