'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { statsYear } from '@rotra/data/player/rules'
import { isStatsHidden, visibleStats } from '@rotra/data/public-session/rules'
import { useParticipantStats } from '@rotra/data/public-session/useParticipantStats'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { ParticipantProfileSheet } from '@rotra/ui/participant-profile-sheet'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PrivateProfileCard } from '@rotra/ui/private-profile-card'
import type { PublicParticipant } from '@rotra/ui/public-participants'
import { ShareDialog } from '@rotra/ui/share-dialog'
import { toast } from '@rotra/ui/toaster'
import { WinRateShareCard } from '@rotra/ui/win-rate-share-card'
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
 * Profile link); an unclaimed player (saved by the club with an email) the same card with the
 * Unclaimed chip and no Share profile or Open ROTRA profile; an always-private player the private
 * card; a guest the Not on ROTRA yet card. The big picture opens the full-photo viewer (#716, D-PHOTO-VIEWER) when it is a
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
  // An unclaimed player (D-2026-11-16-04) gets the full card too, without Share profile or Open
  // ROTRA profile; their stats read by RTR ID like a registered player's.
  const unclaimed = participant?.profile === 'unclaimed'
  const full = participant?.profile === 'registered' || unclaimed
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
        stats={visibleStats(stats.data)}
        showStats={!isStatsHidden(stats.data)}
        statsLoading={!!participant.rtrId && stats.isPending}
        statsError={stats.isError && !unclaimed}
        profileHref={unclaimed ? null : participant.href}
        onShare={link && !unclaimed ? () => setSharing(true) : undefined}
        unclaimed={unclaimed}
      />
      {/* Share profile (2026-11-13-profile-card-open-share): the standard share dialog with Queue's
          win-rate image for this player; closing it returns to the card. */}
      <ShareDialog
        open={sharing}
        onOpenChange={(open) => {
          if (!open) setSharing(false)
        }}
        title="Share profile"
      >
        <WinRateShareCard
          link={link}
          name={participant.nickname || participant.name}
          rtrId={participant.rtrId ?? null}
          picture={participant.pictureUrl ?? null}
          year={statsYear(Date.now())}
          stats={visibleStats(stats.data)}
          onCopy={() => void copyLink()}
          onError={(message) => toast.error(message)}
          onDownloaded={(item) => toast(`${item.label} image downloaded`)}
        />
      </ShareDialog>
      {viewer}
    </>
  )
}
