import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'

export type PlayerAccountRowProps = {
  name: string
  /** Second line: the RTR ID (monospace) on P-GOOGLE-LINK, the email on P-GOOGLE-REQUIRED */
  detail: string
  /** Set the detail in the monospace face (an RTR ID) */
  mono?: boolean
  photoUrl?: string
  className?: string
}

/** The prototype's .gid for a ROTRA player: avatar, full name and one muted line. */
export function PlayerAccountRow({
  name,
  detail,
  mono = false,
  photoUrl,
  className,
}: PlayerAccountRowProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-lg border border-border bg-elev p-3',
        className,
      )}
    >
      <Avatar name={name} src={photoUrl} size={52} />
      <div className="flex min-w-0 flex-1 flex-col">
        <b className="[overflow-wrap:anywhere]">{name}</b>
        <span className={cn('text-[13px] text-fg2 [overflow-wrap:anywhere]', mono && 'font-mono')}>
          {detail}
        </span>
      </div>
    </div>
  )
}
