import { cn } from '@rotra/ui/cn'
import { ParticipantCard } from '@rotra/ui/public-participants/participant-card'

export type PublicParticipant = {
  id: string
  name: string
  /** Uploaded profile picture; initials show when missing. Guests never have one. */
  pictureUrl?: string | null
  /** Registered and unclaimed players have one; guests do not */
  hasProfile: boolean
}

export type PublicWaitlistEntry = {
  id: string
  name: string
}

export type PublicParticipantsProps = {
  /** Confirmed people with a slot, in roster order */
  participants: PublicParticipant[]
  /** People waiting for a slot, in the order they joined; the list is hidden when empty */
  waitlist?: PublicWaitlistEntry[]
  className?: string
}

/**
 * The public page's Participants tab (Q-PUBLIC-PARTICIPANTS): a grid of ParticipantCards, then
 * "Waitlist · N" as a numbered list of names when anyone is waiting. Empty: "Players have not been
 * added yet." Shows no phone, email, level, presence, games, notes or Off Day.
 */
export function PublicParticipants({
  participants,
  waitlist = [],
  className,
}: PublicParticipantsProps) {
  return (
    <section aria-label="Participants" className={cn('flex min-w-0 flex-col gap-3', className)}>
      {participants.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-2.5 p-0">
          {participants.map((p) => (
            <li key={p.id} className="min-w-0">
              <ParticipantCard name={p.name} pictureUrl={p.pictureUrl} hasProfile={p.hasProfile} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-3 py-6 text-center text-sm text-fg2 shadow-card">
          Players have not been added yet.
        </div>
      )}
      {waitlist.length ? (
        <>
          <h3>Waitlist · {waitlist.length}</h3>
          <ol className="m-0 flex list-decimal flex-col gap-0.5 pl-[22px]">
            {waitlist.map((w) => (
              <li key={w.id} className="[overflow-wrap:anywhere]">
                {w.name}
              </li>
            ))}
          </ol>
          <p className="m-0 text-[13px] text-fg2">
            Waitlisted players get a slot if one opens. Ask the Queue Master.
          </p>
        </>
      ) : null}
    </section>
  )
}
