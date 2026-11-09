import type { PublicSessionParticipant } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'

export type PublicParticipantTileProps = {
  /** Full name for a signed-in viewer on a registered player; masked ("J*** A***") otherwise. */
  name: string
  /** Registered players only, shown small and muted under the name. Ignored when masked. */
  nickname?: string | null
  pictureUrl?: string | null
  skillGroup?: PublicSessionParticipant['skillGroup']
  /** Full playing level for the hover label and accessible text. */
  levelLabel?: string | null
  /** Guest, unclaimed profile or visitor view: the name is masked, so no nickname and no link. */
  masked?: boolean
  /** The signed-in viewer's own tile: You pill and accent ring. */
  isViewer?: boolean
  /** Player app profile URL (`/player/find/<RTR>`); only a registered, unmasked tile links. */
  href?: string | null
  /** One-based waitlist position; adds the picture badge and dims the picture. */
  waitlistPosition?: number
  className?: string
}

const ringClasses = {
  beginner: '[--ring:var(--lv-beg)]',
  intermediate: '[--ring:var(--lv-int)]',
  advanced: '[--ring:var(--lv-adv)]',
  none: '[--ring:var(--lv-none)]',
}

/**
 * Public participant tile: picture with a skill-group ring, the name, the nickname for registered
 * players, an optional You pill, and a link to the ROTRA profile for signed-in viewers.
 */
export function PublicParticipantTile({
  name,
  nickname,
  pictureUrl,
  skillGroup,
  levelLabel,
  masked = true,
  isViewer = false,
  href,
  waitlistPosition,
  className,
}: PublicParticipantTileProps) {
  const link = !masked && href ? href : null
  const shownNickname = !masked && nickname ? nickname : null
  const classes = cn(
    'group flex min-w-0 flex-col items-center gap-3.5 text-center',
    ringClasses[skillGroup ?? 'none'],
    isViewer && 'is-viewer',
    link && 'rounded-md text-inherit no-underline',
    className,
  )
  const body = (
    <>
      <span className="relative block w-full">
        <Avatar
          name={name}
          src={pictureUrl ?? undefined}
          className={cn(
            'mx-auto mt-2 h-auto w-4/5 max-w-[77px] aspect-square text-[clamp(14px,4.5vw,22px)] outline-[5px] outline-offset-4',
            isViewer ? 'outline-accent' : 'outline-(--ring)',
            waitlistPosition !== undefined && 'opacity-85',
            link &&
              'group-hover:shadow-[0_0_0_4px_var(--surface),0_0_0_7px_var(--accent)] group-focus-visible:shadow-[0_0_0_4px_var(--surface),0_0_0_7px_var(--accent)]',
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
      <span className="block min-w-0 max-w-full">
        <b
          className={cn(
            'block max-w-full text-[17px] leading-[1.25] [overflow-wrap:anywhere]',
            link &&
              'group-hover:underline group-hover:underline-offset-[3px] group-focus-visible:underline group-focus-visible:underline-offset-[3px]',
          )}
        >
          {waitlistPosition !== undefined ? (
            <span className="sr-only">Waitlist number {waitlistPosition}: </span>
          ) : null}
          {name}
        </b>
        {shownNickname ? (
          <span className="block max-w-full text-[13px] text-fg2 [overflow-wrap:anywhere]">
            {shownNickname}
          </span>
        ) : null}
      </span>
      {isViewer ? (
        <span className="-mt-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs leading-[1.4] font-extrabold tracking-[0.4px] text-on-accent uppercase">
          You
        </span>
      ) : null}
      {levelLabel ? <span className="sr-only">{levelLabel}</span> : null}
    </>
  )

  return link ? (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={levelLabel ?? undefined}
      aria-label={`${name} · view ROTRA profile`}
      className={classes}
    >
      {body}
    </a>
  ) : (
    <div title={levelLabel ?? undefined} className={classes}>
      {body}
    </div>
  )
}
