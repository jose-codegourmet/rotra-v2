'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { statsYear } from '@rotra/data/player/rules'
import { useParticipantStats } from '@rotra/data/public-session/useParticipantStats'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { ParticipantProfileSheet } from '@rotra/ui/participant-profile-sheet'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PlayerShareSheet } from '@rotra/ui/player-share-sheet'
import { PrivateProfileCard } from '@rotra/ui/private-profile-card'
import { ProfileShareCard } from '@rotra/ui/profile-share-card'
import type { PublicParticipant } from '@rotra/ui/public-participants'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

export type ParticipantProfileProps = {
  /** The tapped tile or face; null keeps the card closed */
  participant: PublicParticipant | null
  /** The signed-in Player (mock: the Player session; real: the Player app's access read) */
  viewerPlayerId: string | null
  onClose: () => void
}

/**
 * D-PARTICIPANT-PROFILE on the session page (#731): the card a signed-in Player's tap opens. A
 * registered participant (and the viewer's own tile) gets ParticipantProfileSheet with Stats · YEAR
 * from useParticipantStats, the new-tab profile icon and Share profile (the share dialog with the
 * Profile link); an always-private player the private card; a guest or an unclaimed player the Not on
 * ROTRA yet card. The big picture opens the full-photo viewer (#716, D-PHOTO-VIEWER) when it is a
 * real picture; an always-private player's picture stays public, so it can be enlarged too. Closing
 * the viewer or the share dialog returns to the card.
 */
export function ParticipantProfile({
  participant,
  viewerPlayerId,
  onClose,
}: ParticipantProfileProps) {
  const photo = usePhotoViewer()
  const [sharing, setSharing] = useState(false)
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
  const link = participant.href ?? ''
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast.error("Couldn't copy the link. Copy it from the field.")
    }
  }
  return (
    <>
      <ParticipantProfileSheet
        open={!sharing}
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
        year={statsYear(Date.now())}
        stats={stats.data ?? null}
        statsLoading={!!participant.rtrId && stats.isPending}
        statsError={stats.isError}
        profileHref={participant.href}
        onShare={link ? () => setSharing(true) : undefined}
      />
      {/* Share profile: the standard share dialog for this player; closing it returns to the card. */}
      <PlayerShareSheet
        open={sharing}
        onOpenChange={(open) => {
          if (!open) setSharing(false)
        }}
        title="Share profile"
      >
        <ProfileShareCard
          link={link}
          name={participant.name}
          nickname={participant.nickname}
          picture={participant.pictureUrl ?? null}
          levelLabel={participant.levelLabel ?? null}
          position={null}
          wins={stats.data?.wins ?? null}
          onCopy={() => void copyLink()}
          onError={(message) => toast.error(message)}
          onShared={() => toast('Share sheet opened')}
          onDownloaded={(format) =>
            toast(format === 'story' ? 'Story image downloaded' : 'Post image downloaded')
          }
        />
      </PlayerShareSheet>
      {viewer}
    </>
  )
}
