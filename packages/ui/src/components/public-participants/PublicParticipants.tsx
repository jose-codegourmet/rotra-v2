import type { PublicSessionParticipant } from '@rotra/data/public-session/types'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { ParticipantCard } from '@rotra/ui/public-participants/participant-card'
import type { SkillDistributionCounts } from '@rotra/ui/skill-distribution-bar'

export type PublicParticipant = Omit<PublicSessionParticipant, 'skillGroup' | 'levelLabel'> & {
  id: string
  /** Optional during migration of the public page/preview to the new public read. */
  skillGroup?: PublicSessionParticipant['skillGroup']
  levelLabel?: string | null
  /** @deprecated Public tiles no longer show a profile label. */
  hasProfile?: boolean
}

export type PublicWaitlistEntry = PublicParticipant

export type PublicParticipantsProps = {
  /** Public-safe masked names and levels, in roster order. */
  participants: PublicParticipant[]
  /** In admission order; never capped. */
  waitlist?: PublicWaitlistEntry[]
  /** Unfilled slots from the public read, shown as placeholders until finished. */
  openSlots?: number
  /** Finished sessions show no placeholders or Request to join button. */
  finished?: boolean
  /** Set only after server-verified membership; finished alone never grants full roster. */
  fullRoster?: boolean
  participantCount?: number
  acceptJoinRequests?: boolean
  /** Opens the Request to join sheet; a request never grants a slot or reveals more players. */
  onRequestToJoin?: () => void
  /** Sending needs internet; disable the join prompt while offline. */
  disabled?: boolean
  /** @deprecated Skill mix now belongs to the Want to play? card. Ignored here. */
  skillMix?: SkillDistributionCounts
  className?: string
}

const gridClass = 'm-0 grid list-none grid-cols-3 gap-x-[18px] gap-y-7 p-0 min-[641px]:grid-cols-4'

/** Public participants: plain tiles, up to three rows before joining, followed by waitlist tiles. */
export function PublicParticipants({
  participants,
  waitlist = [],
  openSlots = 0,
  finished = false,
  fullRoster = false,
  participantCount = participants.length,
  acceptJoinRequests = true,
  onRequestToJoin,
  disabled = false,
  className,
}: PublicParticipantsProps) {
  // Never mount roster entries past the wider cap. CSS removes entries 10–12 on phones from
  // both layout and the accessibility tree, with no viewport hook or hydration shift.
  const visibleParticipants = fullRoster ? participants : participants.slice(0, 12)
  const placeholderCount = finished
    ? 0
    : fullRoster
      ? Math.max(0, Math.trunc(openSlots))
      : Math.min(Math.max(0, Math.trunc(openSlots)), Math.max(0, 12 - visibleParticipants.length))
  const showJoinPrompt = !fullRoster && participantCount > 9

  return (
    <section aria-label="Participants" className={cn('flex min-w-0 flex-col gap-3', className)}>
      {participants.length || placeholderCount ? (
        <div className="relative">
          <ul className={cn(gridClass, !fullRoster && 'max-[640px]:[&>li:nth-child(n+10)]:hidden')}>
            {visibleParticipants.map((p) => (
              <li key={p.id} className="min-w-0">
                <ParticipantCard
                  name={p.name}
                  pictureUrl={p.pictureUrl}
                  skillGroup={p.skillGroup}
                  levelLabel={p.levelLabel}
                />
              </li>
            ))}
            {Array.from({ length: placeholderCount }, (_, i) => (
              <li key={`open-${i}`} aria-hidden="true" className="min-w-0">
                <div className="flex flex-col items-center gap-3.5 text-center">
                  <span className="mt-2 h-auto w-4/5 max-w-[77px] aspect-square rounded-full outline-[3px] outline-offset-4 outline-dashed outline-border-strong" />
                  <b className="text-[17px] leading-[1.25] font-medium text-fg3">Open</b>
                </div>
              </li>
            ))}
          </ul>
          {showJoinPrompt ? (
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex h-[170px] flex-col items-center justify-end gap-2 bg-[linear-gradient(to_bottom,transparent,var(--bg)_70%)] pb-1.5 text-fg',
                participantCount <= 12 && 'min-[641px]:hidden',
              )}
            >
              <span className="text-[13px] text-fg2">{participantCount} players are in</span>
              {!finished && acceptJoinRequests ? (
                <span className="text-center text-xs text-fg2">
                  Full roster is for confirmed participants.
                </span>
              ) : null}
              {!finished && acceptJoinRequests ? (
                <Button
                  variant="primary"
                  onClick={onRequestToJoin}
                  disabled={disabled || !onRequestToJoin}
                  className="min-h-12 max-w-full rounded-full px-[22px] text-[15px] font-extrabold shadow-[0_6px_20px_color-mix(in_srgb,var(--accent)_35%,transparent)] touch:px-[22px] touch:text-[15px]"
                >
                  <Icon name="lock" size={16} className="shrink-0" />
                  Join to see the full roster
                </Button>
              ) : (
                <span className="text-center font-bold">
                  Full roster is for confirmed participants.
                </span>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-3 py-6 text-center text-sm text-fg2 shadow-card">
          Players have not been added yet.
        </div>
      )}
      {waitlist.length ? (
        <>
          <h3>Waitlist · {waitlist.length}</h3>
          <ol className={gridClass}>
            {waitlist.map((w, i) => (
              <li key={w.id} className="min-w-0">
                <ParticipantCard
                  name={w.name}
                  pictureUrl={w.pictureUrl}
                  skillGroup={w.skillGroup}
                  levelLabel={w.levelLabel}
                  waitlistPosition={i + 1}
                />
              </li>
            ))}
          </ol>
          <p className="m-0 text-[13px] text-fg2">
            Waitlisted players get a slot if one opens, in this order. Ask the Queue Master.
          </p>
        </>
      ) : null}
    </section>
  )
}
