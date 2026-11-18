'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { statsYear } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { useFindPlayerByRtrId } from '@rotra/data/player/useFindPlayerByRtrId'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from '@rotra/data/player/visibility'
import { isStatsHidden, visibleStats } from '@rotra/data/public-session/rules'
import { useParticipantStats } from '@rotra/data/public-session/useParticipantStats'
import { ParticipantProfileSheet } from '@rotra/ui/participant-profile-sheet'
import { PrivateProfileCard } from '@rotra/ui/private-profile-card'
import { useEffect } from 'react'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'

/** Messages to the framing page (rotra.club): the card has something to show, or was closed. */
type EmbedMessage = 'rotra:card-ready' | 'rotra:card-close' | 'rotra:card-missing'
const tell = (type: EmbedMessage) => {
  // No data travels, only the event name, so any parent may hear it.
  if (window.parent !== window) window.parent.postMessage({ type }, '*')
}

/**
 * The profile an RTR ID names, as the participant profile card over a see-through page. It reads
 * what the public profile page reads, so the profile's visibility rule applies: a private or
 * sign-in-only profile shows the private card. Close tells the framing page instead of navigating.
 */
export function ProfileCardEmbed({ rtrId }: { rtrId: string }) {
  const id = rtrId.trim().toUpperCase()
  const lookup = useFindPlayerByRtrId(id)
  const playerId = lookup.data?.playerId ?? ''
  const profile = usePlayerProfile(playerId),
    rank = usePlayerRank(playerId)
  const stats = useParticipantStats(id, null, Boolean(playerId))
  // The frame is see-through: only the card's own overlay dims the page behind it.
  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
  }, [])
  const hidden =
    [profile.error?.message, rank.error?.message].includes(PROFILE_PRIVATE_MESSAGE) ||
    [profile.error?.message, rank.error?.message].includes(PROFILE_LOGIN_MESSAGE)
  const missing =
    lookup.isError || (!lookup.isPending && !lookup.data) || (profile.isError && !hidden)
  const player = profile.data
  const settled = missing || hidden || Boolean(player)
  useEffect(() => {
    if (missing) tell('rotra:card-missing')
    else if (settled) tell('rotra:card-ready')
  }, [missing, settled])
  const onOpenChange = (open: boolean) => {
    if (!open) tell('rotra:card-close')
  }
  if (missing || !settled) return null
  if (hidden || !player)
    return <PrivateProfileCard open onOpenChange={onOpenChange} variant="private" name={id} />
  const levelIndex = rank.data?.levelIndex ?? null
  const levelCode = levelIndex === null ? null : PLAYING_LEVELS[levelIndex]
  const levelLabel = levelCode
    ? levelCode
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : null
  return (
    <ParticipantProfileSheet
      open
      onOpenChange={onOpenChange}
      name={player.fullName}
      nickname={player.nickname}
      photoUrl={pictureSrc(player.picture, player.playerId, player.fullName) ?? undefined}
      bannerKey={player.bannerKey}
      bannerImageUrl={player.bannerImageUrl}
      levelLabel={levelLabel}
      registeredCity={registeredCity(player.rtrId)}
      rtrId={player.rtrId}
      year={statsYear(Date.now())}
      stats={visibleStats(stats.data)}
      // A visitor who cannot read the stats (not signed in, or the player hid them) gets no stats box.
      showStats={!stats.isError && !isStatsHidden(stats.data)}
      statsLoading={stats.isPending}
      profileHref={`/players/${encodeURIComponent(player.playerId)}`}
    />
  )
}
