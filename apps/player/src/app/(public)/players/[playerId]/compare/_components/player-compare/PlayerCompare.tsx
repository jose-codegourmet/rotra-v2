'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import type { PlayerCompareFilter, SharedGamePlayer } from '@rotra/data/player-compare/types'
import { usePlayerCompare } from '@rotra/data/player-compare/usePlayerCompare'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { CompareFilterBar } from '@rotra/ui/compare-filter-bar'
import { type CompareStatRow, CompareStats } from '@rotra/ui/compare-stats'
import { ErrorState } from '@rotra/ui/error-state'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { levelLabel } from '@rotra/ui/level-pill'
import { PageHeader } from '@rotra/ui/page-header'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { SharedGamesList } from '@rotra/ui/shared-game-row'
import { Skeleton } from '@rotra/ui/skeleton'
import { TogetherCard } from '@rotra/ui/together-card'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name
const percent = (value: number | null) => (value == null ? '—' : `${value}%`)
const lead = (
  mine: number | null | undefined,
  theirs: number | null | undefined,
  lower = false,
): CompareStatRow['lead'] => {
  if (mine == null || theirs == null || mine === theirs) return undefined
  return (lower ? mine < theirs : mine > theirs) ? 'mine' : 'theirs'
}
const dateLabel = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(Date.now() - date.getTime() > 300 * 86400000 ? { year: 'numeric' } : {}),
  })
}

export function PlayerCompare({ playerId }: { playerId: string }) {
  const router = useRouter()
  const session = useSession('player')
  const viewerId = session.data?.account.id ?? ''
  const [filter, setFilter] = useState<PlayerCompareFilter>('all')
  const [page, setPage] = useState(0)
  const photo = usePhotoViewer()
  const compare = usePlayerCompare(viewerId, playerId, { filter, page })
  useEffect(() => {
    if (viewerId && viewerId === playerId)
      router.replace(`/players/${encodeURIComponent(playerId)}`)
  }, [viewerId, playerId, router])
  if (session.isSuccess && !session.data)
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ProfileNotFound
          id={playerId}
          loginRequired
          onSignIn={() =>
            router.push(`/login?returnTo=${encodeURIComponent(`/players/${playerId}/compare`)}`)
          }
        />
      </main>
    )
  const back = () => router.push(`/players/${encodeURIComponent(playerId)}`)
  if (
    session.isPending ||
    (viewerId && viewerId === playerId) ||
    (session.isSuccess && !session.data) ||
    (Boolean(viewerId) && viewerId !== playerId && compare.isPending && !compare.data)
  ) {
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <Card aria-busy="true" aria-label="Loading comparison">
          <Skeleton className="h-64" />
        </Card>
      </main>
    )
  }
  if (session.isError || compare.isError)
    return (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5">
        <Button size="sm" variant="ghost" className="self-start" onClick={back}>
          ← Profile
        </Button>
        <ErrorState
          title="Couldn't load the comparison."
          onRetry={() => {
            void session.refetch()
            void compare.refetch()
          }}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    )
  const data = compare.data
  if (!data)
    return (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5">
        <Button size="sm" variant="ghost" className="self-start" onClick={back}>
          ← Profile
        </Button>
        <ErrorState kind="permission" title="Comparison unavailable.">
          This player could not be found.
        </ErrorState>
      </main>
    )
  const my = data.viewer,
    other = data.other,
    otherName = other.profile.nickname || firstName(other.profile.fullName)
  const myLevel = my.rank?.levelIndex == null ? null : (PLAYING_LEVELS[my.rank.levelIndex] ?? null)
  const otherLevel =
    other.rank?.levelIndex == null ? null : (PLAYING_LEVELS[other.rank.levelIndex] ?? null)
  const myPicture = pictureSrc(my.profile.picture, my.profile.playerId, my.profile.fullName)
  const otherPicture = pictureSrc(
    other.profile.picture,
    other.profile.playerId,
    other.profile.fullName,
  )
  const me = {
    name: my.profile.fullName,
    pictureUrl: myPicture,
    onViewPicture: myPicture
      ? () => photo.show({ src: myPicture, name: my.profile.fullName })
      : undefined,
    level: myLevel,
  }
  const them = {
    name: other.profile.fullName,
    label: otherName,
    pictureUrl: otherPicture,
    onViewPicture: otherPicture
      ? () => photo.show({ src: otherPicture, name: other.profile.fullName })
      : undefined,
    level: otherLevel,
  }
  const stats = data.stats[filter]
  const rows: CompareStatRow[] = [
    {
      label: 'Level',
      mine: levelLabel(myLevel),
      theirs: levelLabel(otherLevel),
      lead: lead(my.rank?.levelIndex, other.rank?.levelIndex),
    },
    {
      label: 'Overall position',
      mine: my.rank?.position == null ? '—' : `#${my.rank.position.toLocaleString('en-PH')}`,
      theirs:
        other.rank?.position == null ? '—' : `#${other.rank.position.toLocaleString('en-PH')}`,
      lead: lead(my.rank?.position, other.rank?.position, true),
    },
    ...(filter === 'h2h'
      ? [
          {
            label: 'Games counted (3 months)',
            mine: my.rank?.recentCount ?? '—',
            theirs: other.rank?.recentCount ?? '—',
            lead: lead(my.rank?.recentCount, other.rank?.recentCount),
          },
          {
            label: 'Win rate overall',
            mine: percent(my.overallWinRate),
            theirs: percent(other.overallWinRate),
            lead: lead(my.overallWinRate, other.overallWinRate),
          },
        ]
      : []),
    {
      label: filter === 'all' ? 'Shared games' : 'Games against each other',
      mine: stats.games,
      theirs: stats.games,
    },
    {
      label: 'Wins in these games',
      mine: stats.myWins,
      theirs: stats.otherWins,
      lead: lead(stats.myWins, stats.otherWins),
    },
    {
      label: 'Win rate in these games',
      mine: percent(stats.myWinRate),
      theirs: percent(stats.otherWinRate),
      lead: lead(stats.myWinRate, stats.otherWinRate),
    },
  ]
  const participant = (p: SharedGamePlayer) => ({
    id: p.id,
    name: p.name,
    label: p.playerId === viewerId ? 'You' : firstName(p.name),
    level: p.level,
    games: p.games,
    pictureUrl: pictureSrc(p.pictureUrl, p.playerId ?? p.id, p.pictureName ?? p.name),
  })
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-1.5">
        <Button variant="ghost" size="sm" className="self-start" onClick={back}>
          ← {other.profile.fullName}
        </Button>
        <PageHeader
          className="[&>div>p]:max-w-none [&>div>div:first-child]:text-xs [&>div>div:first-child]:font-semibold [&>div>div:first-child]:tracking-[0.6px] [&>div>div:first-child]:text-fg2 [&>div>div:first-child]:uppercase"
          eyebrow="Compare"
          title={`You and ${otherName}`}
          description="Official results from finished club sessions. Only singles and doubles count here; fun and partial games are left out."
        />
      </div>
      <CompareFilterBar
        value={filter}
        counts={data.counts}
        onChange={(next) => {
          setFilter(next)
          setPage(0)
        }}
      />
      {filter === 'together' ? (
        <TogetherCard
          me={me}
          them={them}
          games={stats.games}
          won={stats.myWins}
          winRate={stats.myWinRate}
        />
      ) : (
        <CompareStats
          me={me}
          them={them}
          filter={filter}
          rows={rows}
          games={stats.games}
          myWins={stats.myWins}
          otherWins={stats.otherWins}
        />
      )}
      <SharedGamesList
        games={data.games.map((game) => ({
          id: game.id,
          mine: game.mine.map(participant),
          theirs: game.theirs.map(participant),
          meWon: game.meWon,
          together: game.together,
          otherName,
          dateLabel: dateLabel(game.finishedAt),
          sessionTitle: game.sessionTitle,
          clubName: game.clubName,
          score: game.score,
        }))}
        total={data.total}
        page={data.page}
        filter={filter}
        otherName={otherName}
        onPageChange={setPage}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </main>
  )
}
