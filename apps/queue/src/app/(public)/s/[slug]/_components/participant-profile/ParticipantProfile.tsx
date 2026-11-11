'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useParticipantStats } from '@rotra/data/public-session/useParticipantStats'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { ParticipantProfileSheet } from '@rotra/ui/participant-profile-sheet'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
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
 * unclaimed player the Not on ROTRA yet card. The big picture opens the full-photo viewer (#716,
 * D-PHOTO-VIEWER) when it is a real picture; an always-private player's picture stays public, so it
 * can be enlarged too. Closing the viewer returns to the card.
 */
export function ParticipantProfile({
  participant,
  viewerPlayerId,
  onClose,
}: ParticipantProfileProps) {
  const photo = usePhotoViewer()
  const full = participant?.profile === 'registered'
  const stats = useParticipantStats(participant?.rtrId, viewerPlayerId, full)
  if (!participant?.profile) return null
  const onOpenChange = (open: boolean) => {
    if (!open) onClose()
  }
  const photoUrl = participant.pictureUrl ?? undefined
  const viewPhoto = photoUrl
    ? () => photo.show({ src: photoUrl, name: participant.name })
    : undefined
  const viewer = photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null
  if (!full)
    return (
      <>
        <PrivateProfileCard
          open
          onOpenChange={onOpenChange}
          variant={participant.profile === 'private' ? 'private' : 'guest'}
          name={participant.name}
          photoUrl={photoUrl}
          onPhotoClick={viewPhoto}
          bannerKey={participant.bannerKey}
          bannerImageUrl={participant.bannerImageUrl}
        />
        {viewer}
      </>
    )
  return (
    <>
      <ParticipantProfileSheet
        open
        onOpenChange={onOpenChange}
        name={participant.name}
        nickname={participant.nickname}
        photoUrl={photoUrl}
        onPhotoClick={viewPhoto}
        bannerKey={participant.bannerKey}
        bannerImageUrl={participant.bannerImageUrl}
        levelLabel={participant.levelLabel ?? null}
        tonight={participant.tonight ?? null}
        registeredCity={registeredCity(participant.rtrId ?? null)}
        rtrId={participant.rtrId ?? null}
        stats={stats.data ?? null}
        statsLoading={!!participant.rtrId && stats.isPending}
        statsError={stats.isError}
        profileHref={participant.href}
      />
      {viewer}
    </>
  )
}
