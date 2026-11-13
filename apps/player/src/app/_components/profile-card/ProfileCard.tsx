'use client'
import { registeredCity } from '@rotra/data/club-player/fetchers'
import type { PlayingLevel } from '@rotra/data/player/types'
import { countYearCountedWins, statsYear } from '@rotra/data/player/rules'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { type ClubMemberProfile, ClubMemberProfileSheet } from '@rotra/ui/club-member-profile-sheet'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { levelLabel } from '@rotra/ui/level-pill'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { useRouter } from 'next/navigation'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'

/** Who a profile card shows, as the opening list knows them (club members, leaderboard rows). */
export type ProfileCardPerson = {
  /** Null for a masked row that carries no id */
  playerId: string | null
  /** Full name, or the masked name */
  name: string
  nickname: string | null
  /** Picture reference (photo URL, data URL or character:<id>) */
  picture: string | null
  level: PlayingLevel | null
  isYou: boolean
  /** Masked for this viewer: the private card, and nothing is requested for them */
  masked: boolean
  /** A masked row's own banner, when the list carries it (the picture and banner stay public) */
  bannerKey?: string | null
  bannerImageUrl?: string | null
}

/**
 * The profile card in ROTRA Player (D-PARTICIPANT-PROFILE), opened from club members and the
 * leaderboard: ClubMemberProfileSheet with the profile (banner, RTR ID), rank (#N overall) and the
 * counted games this calendar year. Inside Player the profile opens in the same tab (the name arrow
 * and Open ROTRA profile); Share profile opens the share dialog for this player. A masked row opens
 * the private card with their own banner.
 */
export function ProfileCard({
  person,
  onClose,
}: {
  person: ProfileCardPerson | null
  onClose: () => void
}) {
  const router = useRouter()
  const named = !!person && !person.masked && !!person.playerId
  const playerId = named ? (person?.playerId ?? '') : ''
  const profile = usePlayerProfile(playerId)
  const rank = usePlayerRank(playerId)
  const games = usePlayerGames(playerId)
  const share = usePlayerShareSheet(named ? playerId : null)
  const photo = usePhotoViewer()
  if (!person) return null
  const picture = pictureSrc(person.picture, person.playerId ?? person.name, person.name) ?? null
  const href = `/players/${encodeURIComponent(playerId)}`
  let card: ClubMemberProfile
  if (!named)
    card = {
      kind: 'private',
      name: person.name,
      picture,
      bannerKey: person.bannerKey,
      bannerImageUrl: person.bannerImageUrl,
    }
  else {
    const year = countYearCountedWins(games.data ?? [], Date.now())
    const rtrId = profile.data?.rtrId ?? null
    card = {
      kind: 'public',
      name: person.name,
      nickname: person.nickname,
      picture,
      bannerKey: profile.data?.bannerKey,
      bannerImageUrl: profile.data?.bannerImageUrl,
      levelLabel: person.level ? levelLabel(person.level) : null,
      position: rank.data?.position ?? null,
      isYou: person.isYou,
      registeredCity: registeredCity(rtrId),
      rtrId,
      stats: games.data ? { ...year, losses: year.games - year.wins } : null,
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
        year={statsYear(Date.now())}
        loading={named && (games.isPending || profile.isPending)}
        profileHref={href}
        onOpenFullProfile={() => {
          if (!named) return
          onClose()
          router.push(href)
        }}
        onShare={named ? share.openProfile : undefined}
        onViewPhoto={picture ? () => photo.show({ src: picture, name: person.name }) : undefined}
      />
      {share.sheet}
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </>
  )
}
