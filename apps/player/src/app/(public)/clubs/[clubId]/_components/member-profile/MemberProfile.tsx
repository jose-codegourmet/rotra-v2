'use client'
import type { ClubPageMember } from '@rotra/data/club-page/types'
import { registeredCity } from '@rotra/data/club-player/fetchers'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { type ClubMemberProfile, ClubMemberProfileSheet } from '@rotra/ui/club-member-profile-sheet'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { levelLabel } from '@rotra/ui/level-pill'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { useRouter } from 'next/navigation'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'

const WINDOW_MS = 90 * 864e5

/**
 * The profile dialog a club member opens (P-CLUB-PAGE grid, P-CLUB-MEMBERS rows). Signed-in only;
 * a masked member gets the private card and nothing is requested for them.
 */
export function MemberProfile({
  member,
  onClose,
}: {
  member: ClubPageMember | null
  onClose: () => void
}) {
  const router = useRouter()
  const playerId = member?.playerId ?? ''
  const profile = usePlayerProfile(playerId)
  const rank = usePlayerRank(playerId)
  const games = usePlayerGames(playerId)
  const photo = usePhotoViewer()
  if (!member) return null
  const picture = pictureSrc(member.picture, member.playerId ?? member.key, member.name) ?? null
  let card: ClubMemberProfile
  if (member.masked || !member.playerId) card = { kind: 'private', name: member.name, picture }
  else {
    const since = Date.now() - WINDOW_MS
    const counted = (games.data ?? [])
      .filter((s) => Date.parse(s.finishedAt) >= since)
      .flatMap((s) => s.games.filter((g) => g.counting === 'counted'))
    const wins = counted.filter((g) => g.result === 'won').length
    const rtrId = profile.data?.rtrId ?? null
    card = {
      kind: 'public',
      name: member.name,
      nickname: member.nickname,
      picture,
      bannerKey: profile.data?.bannerKey,
      bannerImageUrl: profile.data?.bannerImageUrl,
      levelLabel: member.level ? levelLabel(member.level) : null,
      position: rank.data?.position ?? null,
      isYou: member.isYou,
      registeredCity: registeredCity(rtrId),
      rtrId,
      stats: games.data ? { games: counted.length, wins, losses: counted.length - wins } : null,
    }
  }
  return (
    <>
      <ClubMemberProfileSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        profile={card}
        loading={!member.masked && (games.isPending || profile.isPending)}
        onOpenFullProfile={() => {
          if (member.playerId) router.push(`/players/${member.playerId}`)
        }}
        onViewPhoto={picture ? () => photo.show({ src: picture, name: member.name }) : undefined}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </>
  )
}
