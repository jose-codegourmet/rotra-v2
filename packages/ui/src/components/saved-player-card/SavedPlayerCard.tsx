import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { IDENTITY_LABEL, type Identity } from '@rotra/ui/identity-chip/variants'
import { LevelPill, levelLabel } from '@rotra/ui/level-pill'

export type SavedPlayerCardProps = {
  name: string
  nickname?: string | null
  photoUrl?: string
  identity: Identity
  level: PlayingLevel | null
  /** Where the player is in the live session: "Playing · Court 1" or "At the session" */
  live?: { kind: 'playing' | 'waiting'; text: string }
  /** City where the profile was first registered (from the RTR ID); null when unknown */
  registeredCity: string | null
  /** Sessions this player has played at this club */
  sessionsHere: number
  /** Formatted date the club saved them, e.g. "Oct 3" */
  addedLabel: string
  onOpenProfile: () => void
  /** Shown only for guests and unclaimed profiles */
  onInvite?: () => void
}

const DOT: Record<Identity, string> = {
  registered: 'bg-accent',
  unclaimed: 'bg-warn',
  guest: 'bg-fg3',
  pending: 'bg-fg3',
}

/**
 * One saved player in the Saved players grid: picture with an identity dot, name, nickname, level and
 * live state open the profile; meta lines and Invite sit below. Never shows the RTR ID or a phone.
 */
export function SavedPlayerCard({
  name,
  nickname,
  photoUrl,
  identity,
  level,
  live,
  registeredCity,
  sessionsHere,
  addedLabel,
  onOpenProfile,
  onInvite,
}: SavedPlayerCardProps) {
  const canInvite = identity === 'guest' || identity === 'unclaimed'
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-2xl border border-border-strong bg-surface pb-3',
        'transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-accent/60',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label={`${name}, ${levelLabel(level)}, ${IDENTITY_LABEL[identity]}. Open profile`}
        className="flex flex-col items-center gap-[3px] border-0 bg-[linear-gradient(180deg,var(--accent-subtle),transparent_70px)] px-3 pt-[18px] text-center"
      >
        <span className="relative mb-1.5">
          <Avatar
            name={name}
            src={photoUrl}
            size={64}
            className={
              photoUrl
                ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--border-strong)]'
                : undefined
            }
          />
          <i
            aria-hidden
            className={cn(
              'absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-[3px] border-surface',
              DOT[identity],
            )}
          />
        </span>
        <span className="text-[15px] leading-tight font-extrabold [overflow-wrap:anywhere]">
          {name}
        </span>
        <span className="min-h-[18px] text-xs text-fg2 [overflow-wrap:anywhere]">
          {nickname ? `“${nickname}”` : ' '}
        </span>
        <LevelPill level={level} className="mt-1" />
        {live ? (
          <span
            className={cn(
              'mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-fg2',
              live.kind === 'playing' && 'text-accent',
            )}
          >
            <i
              aria-hidden
              className={cn(
                'size-2 rounded-full bg-fg3',
                live.kind === 'playing' && 'bg-accent shadow-[0_0_0_3px_var(--accent-subtle)]',
              )}
            />
            {live.text}
          </span>
        ) : null}
      </button>
      <div className="flex flex-col gap-[3px] px-3.5 text-xs text-fg2">
        <span className="inline-flex items-center gap-[5px]">
          <Icon name="pin" size={13} className="text-accent" />
          {registeredCity ?? (identity === 'pending' ? 'Lookup after sync' : 'Not registered')}
        </span>
        <span>
          <b className="tabular-nums">{sessionsHere}</b> session{sessionsHere === 1 ? '' : 's'} here
        </span>
        <span>Added {addedLabel}</span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3.5">
        <IdentityChip identity={identity} />
        {canInvite && onInvite ? (
          <Button size="xs" variant="primary" onClick={onInvite} aria-label={`Invite ${name}`}>
            Invite
          </Button>
        ) : null}
      </div>
    </article>
  )
}
