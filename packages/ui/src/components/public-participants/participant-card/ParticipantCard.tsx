import type { PublicSessionParticipant } from '@rotra/data/public-session/types'
import { PublicParticipantTile } from '@rotra/ui/public-participant-tile'

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

/** Plain masked public tile: a thin wrapper over PublicParticipantTile with no nickname, You or link. */
export function ParticipantCard({
  name,
  pictureUrl,
  skillGroup,
  levelLabel,
  waitlistPosition,
  className,
}: ParticipantCardProps) {
  return (
    <PublicParticipantTile
      name={name}
      pictureUrl={pictureUrl}
      skillGroup={skillGroup}
      levelLabel={levelLabel}
      waitlistPosition={waitlistPosition}
      masked
      className={className}
    />
  )
}
