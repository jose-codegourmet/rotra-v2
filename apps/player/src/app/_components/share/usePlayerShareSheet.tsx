'use client'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerShareData } from '@rotra/data/player/usePlayerShareData'
import { ErrorState } from '@rotra/ui/error-state'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { PlayerShareSheet } from '@rotra/ui/player-share-sheet'
import { RankShareCard } from '@rotra/ui/rank-share-card'
import { SessionGamesShareCard } from '@rotra/ui/session-games-share-card'
import { SessionResultShareCard } from '@rotra/ui/session-result-share-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { pictureSrc } from '../profile-picture/pictureSrc'

type Selection = { kind: 'rank' | 'result' | 'games'; sessionId?: string }
export function usePlayerShareSheet(playerId: string | null) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const data = usePlayerShareData(playerId, selection?.sessionId, !!selection)
  const value = data.data
  const profile = value && 'profile' in value ? value.profile : null
  const link =
    value && 'link' in value && typeof window !== 'undefined'
      ? new URL(value.link ?? '', window.location.origin).href
      : ''
  const common = {
    link,
    name: profile?.fullName ?? '',
    nickname: profile?.nickname,
    picture: profile ? pictureSrc(profile.picture, profile.playerId, profile.fullName) : null,
    onCopy: async () => {
      try {
        await navigator.clipboard.writeText(link)
        toast('Link copied')
      } catch {
        toast.error("Couldn't copy the link. Copy it from the address bar.")
      }
    },
    onError: (message: string) => toast.error(message),
    onShared: () => toast('Share sheet opened'),
    onDownloaded: () => toast('Image downloaded'),
  }
  const title =
    selection?.kind === 'rank'
      ? 'Share rank'
      : selection?.kind === 'result'
        ? 'Share result'
        : 'Share games'
  const sheet = (
    <PlayerShareSheet
      open={!!selection}
      onOpenChange={(next) => {
        if (!next) setSelection(null)
      }}
      title={title}
    >
      {data.isPending ? (
        <Skeleton className="h-80" />
      ) : data.isError ? (
        <ErrorState title="Couldn't load the share card." onRetry={() => void data.refetch()}>
          {data.error.message}
        </ErrorState>
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
    openRank: () => setSelection({ kind: 'rank' }),
    openResult: (sessionId: string) => setSelection({ kind: 'result', sessionId }),
    openGames: (sessionId: string) => setSelection({ kind: 'games', sessionId }),
  }
}
