'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from '@rotra/data/player/visibility'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import type { GameRowPlayer } from '@rotra/ui/game-row'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { playedSessions, SessionRecordList } from '@rotra/ui/profile-sessions-card'
import { SessionMatchesSheet } from '@rotra/ui/session-matches-sheet'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GamePlayerProfile } from '@/app/_components/game-player-profile/GamePlayerProfile'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import Loading from '../../loading'

/**
 * P-SESSIONS (`/players/<id>/sessions`, 2026-11-13-player-recent-sessions-games): every club session
 * the player played in, newest first, as the Recent sessions rows; a row opens that session's
 * matches dialog. Back to the profile. A private profile shows the private gate, a profile that
 * needs sign-in the sign-in card, like Games.
 */
export function PlayerSessions({ playerId }: { playerId: string }) {
  const profile = usePlayerProfile(playerId),
    games = usePlayerGames(playerId),
    router = useRouter()
  const account = useAppSelector(selectAccount)
  const session = useSession('player')
  const viewerId = session.data?.account.id ?? account?.id ?? null
  const own = viewerId === playerId
  const sharing = usePlayerShareSheet(own ? playerId : null)
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [openPlayer, setOpenPlayer] = useState<GameRowPlayer | null>(null)
  const back = (
    <Button
      size="sm"
      variant="ghost"
      className="self-start"
      onClick={() => router.push(`/players/${playerId}`)}
    >
      ← {profile.data?.fullName ?? 'Profile'}
    </Button>
  )
  if (
    profile.error?.message === PROFILE_PRIVATE_MESSAGE ||
    games.error?.message === PROFILE_PRIVATE_MESSAGE
  )
    return (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5">
        <Button size="sm" variant="ghost" className="self-start" onClick={() => router.push('/')}>
          ← Leaderboard
        </Button>
        <ProfileNotFound id={playerId} alwaysPrivate />
      </main>
    )
  if (
    profile.error?.message === PROFILE_LOGIN_MESSAGE ||
    games.error?.message === PROFILE_LOGIN_MESSAGE
  )
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ProfileNotFound
          id={playerId}
          loginRequired
          onSignIn={() =>
            router.push(`/login?returnTo=${encodeURIComponent(`/players/${playerId}/sessions`)}`)
          }
        />
      </main>
    )
  if (profile.data === null)
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ProfileNotFound id={playerId} />
      </main>
    )
  const player = profile.data
  if (!player || !games.data)
    return profile.isError || games.isError ? (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState
          title="Couldn't load the sessions."
          retrying={profile.isFetching || games.isFetching}
          onRetry={() => {
            void profile.refetch()
            void games.refetch()
          }}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <Loading />
    )
  const firstName = player.nickname || player.fullName.split(' ')[0] || player.fullName
  const list = playedSessions(games.data)
  const me = {
    name: player.fullName,
    label: own ? 'You' : firstName,
    picture: pictureSrc(player.picture, player.playerId, player.fullName) ?? null,
    playerId,
  }
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      {back}
      <PageHeader
        eyebrow={player.fullName}
        title="Sessions"
        description={`Every club session ${own ? 'you' : firstName} played in, newest first. Tap one to see the matches.`}
      />
      <Card>
        <SessionRecordList sessions={list} onOpenSession={setOpenSessionId} />
      </Card>
      <SessionMatchesSheet
        session={list.find((entry) => entry.id === openSessionId) ?? null}
        onOpenChange={(open) => {
          if (!open) setOpenSessionId(null)
        }}
        whose={own ? 'Your' : `${player.nickname || player.fullName}'s`}
        me={me}
        onOpenPlayer={setOpenPlayer}
        onShareGame={own ? sharing.openGame : undefined}
        onSharePerformance={own ? sharing.openPerformance : undefined}
      />
      <GamePlayerProfile
        player={openPlayer}
        viewerId={viewerId}
        onClose={() => setOpenPlayer(null)}
      />
      {sharing.sheet}
    </main>
  )
}
