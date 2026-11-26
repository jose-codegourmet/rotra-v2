'use client'
import { useMatchPage } from '@rotra/data/match-page/useMatchPage'
import type { GameRowPlayer } from '@rotra/ui/game-row'
import { MatchPage } from '@rotra/ui/match-page'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GamePlayerProfile } from '@/app/_components/game-player-profile/GamePlayerProfile'
import {
  clearMatchFrom,
  type MatchFrom,
  openMatchFromMatch,
  readMatchFrom,
} from '@/app/_components/match-link/useOpenMatch'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'

/**
 * P-MATCH-PAGE (`/matches/[matchId]`, 2026-11-25 match page log): wires the public match page read
 * to MatchPage. Faces open the profile card, the signed-in player's own games get Share game, and
 * the back button returns to the page the court was tapped on (else the leaderboard).
 */
export function PlayerMatchPage({ matchId }: { matchId: string }) {
  const router = useRouter()
  const match = useMatchPage(matchId)
  const [from, setFrom] = useState<MatchFrom | null>(null)
  const [openPlayer, setOpenPlayer] = useState<GameRowPlayer | null>(null)
  // The back target lives in this tab's storage, so it is read after the first render.
  useEffect(() => setFrom(readMatchFrom(matchId)), [matchId])
  const page = match.data
  const viewerId = page?.viewerPlayerId ?? null
  const sharing = usePlayerShareSheet(viewerId)
  return (
    <>
      <MatchPage
        matchId={matchId}
        page={match.isError ? undefined : page}
        error={match.isError}
        retrying={match.isFetching}
        onRetry={() => void match.refetch()}
        backLabel={from?.label ?? 'Leaderboard'}
        onBack={() => {
          clearMatchFrom()
          router.push(from?.href ?? '/')
        }}
        onOpenPlayer={setOpenPlayer}
        onShareGame={
          page && viewerId ? (gameId) => sharing.openGame(page.session.id, gameId) : undefined
        }
        onOpenGame={(gameId) => openMatchFromMatch(router, matchId, gameId)}
      />
      <GamePlayerProfile
        player={openPlayer}
        viewerId={viewerId}
        onClose={() => setOpenPlayer(null)}
      />
      {sharing.sheet}
    </>
  )
}
