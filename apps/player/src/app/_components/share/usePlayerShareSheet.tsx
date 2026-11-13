'use client'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerProfileShareData } from '@rotra/data/player/usePlayerProfileShareData'
import { usePlayerShareData } from '@rotra/data/player/usePlayerShareData'
import { ErrorState } from '@rotra/ui/error-state'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { PlayerShareSheet } from '@rotra/ui/player-share-sheet'
import { ProfileShareCard } from '@rotra/ui/profile-share-card'
import { RankShareCard } from '@rotra/ui/rank-share-card'
import { SessionGamesShareCard } from '@rotra/ui/session-games-share-card'
import { SessionResultShareCard } from '@rotra/ui/session-result-share-card'
import { SHARE_FORMATS, type ShareFormat } from '@rotra/ui/share-card/helpers'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { pictureSrc } from '../profile-picture/pictureSrc'

type Selection = { kind: 'rank' | 'result' | 'games' | 'profile'; sessionId?: string }
export function usePlayerShareSheet(playerId: string | null) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const data = usePlayerShareData(
    playerId,
    selection?.sessionId,
    !!selection && selection.kind !== 'profile',
  )
  const profileData = usePlayerProfileShareData(playerId, selection?.kind === 'profile')
  const profileShare = profileData.data
  const value = data.data
  const profile = value && 'profile' in value ? value.profile : null
  const link =
    value && 'link' in value && typeof window !== 'undefined'
      ? new URL(value.link ?? '', window.location.origin).href
      : ''
  const profileLink =
    profileShare && typeof window !== 'undefined'
      ? new URL(profileShare.link, window.location.origin).href
      : ''
  const copyLink = async (url: string, profileLink = false) => {
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied')
    } catch {
      toast.error(
        profileLink
          ? `Couldn't copy. Your profile link is ${url}`
          : "Couldn't copy the link. Copy it from the address bar.",
      )
    }
  }
  const downloaded = (format: ShareFormat) =>
    toast(
      `${SHARE_FORMATS.find((size) => size.format === format)?.label ?? 'Share'} image downloaded`,
    )
  const common = {
    link,
    name: profile?.fullName ?? '',
    nickname: profile?.nickname,
    picture: profile ? pictureSrc(profile.picture, profile.playerId, profile.fullName) : null,
    onCopy: () => void copyLink(link),
    onError: (message: string) => toast.error(message),
    onShared: () => toast('Share sheet opened'),
    onDownloaded: downloaded,
  }
  const title =
    selection?.kind === 'profile'
      ? 'Share profile'
      : selection?.kind === 'rank'
        ? 'Share rank'
        : selection?.kind === 'result'
          ? 'Share result'
          : 'Share games'
  const active = selection?.kind === 'profile' ? profileData : data
  const sheet = (
    <PlayerShareSheet
      open={!!selection}
      onOpenChange={(next) => {
        if (!next) setSelection(null)
      }}
      title={title}
    >
      {active.isPending ? (
        <Skeleton className="h-80" />
      ) : active.isError ? (
        <ErrorState title="Couldn't load the share card." onRetry={() => void active.refetch()}>
          {active.error.message}
        </ErrorState>
      ) : selection?.kind === 'profile' ? (
        profileShare ? (
          <ProfileShareCard
            {...common}
            link={profileLink}
            onCopy={() => void copyLink(profileLink, true)}
            name={profileShare.profile.fullName}
            nickname={profileShare.profile.nickname}
            picture={pictureSrc(
              profileShare.profile.picture,
              profileShare.profile.playerId,
              profileShare.profile.fullName,
            )}
            levelLabel={
              profileShare.levelIndex === null
                ? null
                : levelLabel(PLAYING_LEVELS[profileShare.levelIndex] ?? null)
            }
            position={profileShare.position}
            wins={profileShare.wins}
          />
        ) : (
          <Notice>No share card is available.</Notice>
        )
      ) : value?.kind === 'not-shared' ? (
        <Notice>{value.message}</Notice>
      ) : value?.kind === 'rank' ? (
        <RankShareCard
          {...common}
          level={(value.rank.levelIndex ?? 0) + 1}
          levelLabel={levelLabel(PLAYING_LEVELS[value.rank.levelIndex ?? 0] ?? null)}
          position={value.rank.position}
        />
      ) : value?.kind === 'session' ? (
        selection?.kind === 'result' ? (
          <SessionResultShareCard
            {...common}
            title={value.session.title}
            clubName={value.session.clubName}
            dateLabel={new Date(value.session.finishedAt).toLocaleDateString('en-PH', {
              timeZone: 'Asia/Manila',
              month: 'short',
              day: 'numeric',
            })}
            wins={value.wins}
            losses={value.losses}
            games={value.session.games.length}
            position={value.position}
          />
        ) : (
          <SessionGamesShareCard
            {...common}
            title={value.session.title}
            clubName={value.session.clubName}
            dateLabel={new Date(value.session.finishedAt).toLocaleDateString('en-PH', {
              timeZone: 'Asia/Manila',
              month: 'short',
              day: 'numeric',
            })}
            wins={value.wins}
            losses={value.losses}
            games={value.session.games}
          />
        )
      ) : (
        <Notice>No share card is available.</Notice>
      )}
    </PlayerShareSheet>
  )
  return {
    sheet,
    openProfile: () => setSelection({ kind: 'profile' }),
    openRank: () => setSelection({ kind: 'rank' }),
    openResult: (sessionId: string) => setSelection({ kind: 'result', sessionId }),
    openGames: (sessionId: string) => setSelection({ kind: 'games', sessionId }),
  }
}
