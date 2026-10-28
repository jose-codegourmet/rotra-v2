import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'

export type ParticipantCardProps = {
  name: string
  /** Uploaded profile picture; initials show when missing. Guests never have one. */
  pictureUrl?: string | null
  /** Registered and unclaimed players: shows "Has a ROTRA profile". Guests get no label. */
  hasProfile: boolean
  className?: string
}

/**
 * One confirmed person on the public Participants grid: picture or initials, name, and
 * "Has a ROTRA profile" when they have one. Not a link; never shows level, presence or contacts.
 */
export function ParticipantCard({ name, pictureUrl, hasProfile, className }: ParticipantCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface p-2.5',
        className,
      )}
    >
      <Avatar name={name} src={pictureUrl ?? undefined} size={36} />
      <div className="min-w-0">
        <b className="block text-sm font-semibold [overflow-wrap:anywhere]">{name}</b>
        {hasProfile ? <p className="m-0 text-[13px] text-fg2">Has a ROTRA profile</p> : null}
      </div>
    </div>
  )
}
