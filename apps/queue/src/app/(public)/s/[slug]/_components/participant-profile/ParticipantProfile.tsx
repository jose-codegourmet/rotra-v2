'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useParticipantStats } from '@rotra/data/public-session/useParticipantStats'
import { ParticipantProfileSheet } from '@rotra/ui/participant-profile-sheet'
import { PrivateProfileCard } from '@rotra/ui/private-profile-card'
import type { PublicParticipant } from '@rotra/ui/public-participants'

export type ParticipantProfileProps = {
  /** The tapped tile; null keeps the card closed */
  participant: PublicParticipant | null
  /** The signed-in Player (mock: the Player session; real: the Player app's access read) */
  viewerPlayerId: string | null
  onClose: () => void
}

/**
 * D-PARTICIPANT-PROFILE on the session page (#731): the card a signed-in Player's tap opens. A
 * registered participant (and the viewer's own tile) gets ParticipantProfileSheet with Stats · last
 * 90 days from useParticipantStats; an always-private player the private card; a guest or an
 * unclaimed player the Not on ROTRA yet card. The full-photo viewer (#716) is not built yet, so the
 * big picture is not a button.
 */
export function ParticipantProfile({
  participant,
  viewerPlayerId,
  onClose,
}: ParticipantProfileProps) {
  const full = participant?.profile === 'registered'
  const stats = useParticipantStats(participant?.rtrId, viewerPlayerId, full)
  if (!participant?.profile) return null
  const onOpenChange = (open: boolean) => {
    if (!open) onClose()
  }
  if (!full)
    return (
      <PrivateProfileCard
        open
        onOpenChange={onOpenChange}
        variant={participant.profile === 'private' ? 'private' : 'guest'}
        name={participant.name}
        photoUrl={participant.pictureUrl ?? undefined}
      />
    )
  return (
    <ParticipantProfileSheet
      open
      onOpenChange={onOpenChange}
      name={participant.name}
      nickname={participant.nickname}
      photoUrl={participant.pictureUrl ?? undefined}
      levelLabel={participant.levelLabel ?? null}
      tonight={participant.tonight ?? null}
      registeredCity={registeredCity(participant.rtrId ?? null)}
      rtrId={participant.rtrId ?? null}
      stats={stats.data ?? null}
      statsLoading={!!participant.rtrId && stats.isPending}
      statsError={stats.isError}
      profileHref={participant.href}
    />
  )
}
