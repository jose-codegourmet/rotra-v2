import type { PublicSessionParticipant } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'

export type ParticipantCardProps = {
  /** Masked public name ("J*** A***"); never pass a full name. */
  name: string
  pictureUrl?: string | null
  skillGroup?: PublicSessionParticipant['skillGroup']
  /** Full playing level for the hover label, supplied by the public read. */
  levelLabel?: string | null
  /** @deprecated Public tiles no longer show a profile label. */
  hasProfile?: boolean
  /** One-based position; adds the picture badge and dims the picture. */
  waitlistPosition?: number
  className?: string
}

const ringClasses = {
  beginner: '[--ring:var(--lv-beg)]',
  intermediate: '[--ring:var(--lv-int)]',
  advanced: '[--ring:var(--lv-adv)]',
  none: '[--ring:var(--lv-none)]',
}

/** Plain public tile: masked name and picture with a skill-group ring, never a profile link. */
export function ParticipantCard({
  name,
  pictureUrl,
  skillGroup,
  levelLabel,
  waitlistPosition,
  className,
}: ParticipantCardProps) {
  return (
    <div
      title={levelLabel ?? undefined}
      className={cn(
        'flex min-w-0 flex-col items-center gap-3.5 text-center',
        ringClasses[skillGroup ?? 'none'],
        className,
      )}
    >
      <span className="relative block w-full">
        <Avatar
          name={name}
          src={pictureUrl ?? undefined}
          className={cn(
            'mx-auto mt-2 h-auto w-4/5 max-w-[77px] aspect-square text-[clamp(14px,4.5vw,22px)] outline-[5px] outline-offset-4 outline-(--ring)',
            waitlistPosition !== undefined && 'opacity-85',
          )}
        />
        {waitlistPosition !== undefined ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-[calc(50%-44px)] grid h-6 min-w-6 place-items-center rounded-full border-2 border-(--ring) bg-bg px-1.5 text-xs font-extrabold text-fg"
          >
            {waitlistPosition}
          </span>
        ) : null}
      </span>
      <b className="block max-w-full text-[17px] leading-[1.25] [overflow-wrap:anywhere]">
        {waitlistPosition !== undefined ? (
          <span className="sr-only">Waitlist number {waitlistPosition}: </span>
        ) : null}
        {name}
      </b>
      {levelLabel ? <span className="sr-only">{levelLabel}</span> : null}
    </div>
  )
}
