'use client'
import type { PlayerGame, PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import type { GameRowPlayer, GameRowProps } from '@rotra/ui/game-row'
import { Icon } from '@rotra/ui/icon'
import { Notice } from '@rotra/ui/notice'
import { Pager } from '@rotra/ui/pager'
import { SessionGames } from '@rotra/ui/session-games'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { useRef, useState } from 'react'

/** Sessions per page on the Games page (owner, November 13, 2026: “paginate to 3 sessions per page”) */
const PER_PAGE = 3

export type MatchHistoryProps = {
  sessions: PlayerSessionRecord[]
  activeTab: 'counted' | 'other'
  onTabChange: (tab: 'counted' | 'other') => void
  notices?: string[]
  /** Page of sessions, from 1; switching tabs, filtering or another player goes back to 1 */
  page?: number
  onPageChange?: (page: number) => void
  /**
   * The Weekly performance bar filter (Singles and doubles tab only): keeps the games it matches;
   * sessions with none are left out and the empty state reads “No games match this filter.”
   */
  gameFilter?: ((session: PlayerSessionRecord, game: PlayerGame) => boolean) | null
  /** The profile owner, drawn first on every court */
  me?: GameRowProps['me']
  /** Opens a face's profile card */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /**
   * Your own history: each session's publication (Standings shared by the club). Share performance
   * and Share games show on every session; Share result only once published (D-2026-11-13-06).
   */
  publication?: Record<string, boolean>
  onSharePerformance?: (sessionId: string) => void
  onShareResult?: (sessionId: string) => void
  onShareGames?: (sessionId: string) => void
  /** Your own games: the share icon on each court */
  onShareGame?: (sessionId: string, gameId: string) => void
}
export function MatchHistory({
  sessions,
  activeTab,
  onTabChange,
  notices = [],
  page = 1,
  onPageChange,
  gameFilter,
  me,
  onOpenPlayer,
  publication,
  onSharePerformance,
  onShareResult,
  onShareGames,
  onShareGame,
}: MatchHistoryProps) {
  const listRef = useRef<HTMLDivElement>(null)
  // Uncontrolled when no onPageChange is given (stories, other callers).
  const [ownPage, setOwnPage] = useState(1)
  const pageNow = onPageChange ? page : ownPage
  const setPage = onPageChange ?? setOwnPage
  const counts = sessions
    .flatMap((s) => s.games)
    .reduce(
      (n, g) => {
        n[g.counting === 'counted' ? 'counted' : 'other']++
        return n
      },
      { counted: 0, other: 0 },
    )
  const own = !!publication
  const shareRow = (session: PlayerSessionRecord) => {
    if (!own) return null
    const published = !!publication?.[session.id]
    return (
      <div className="mt-2 mb-1 flex flex-wrap items-center gap-2">
        {onSharePerformance ? (
          <Button size="xs" onClick={() => onSharePerformance(session.id)}>
            <Icon name="share" /> Share performance
          </Button>
        ) : null}
        {published && onShareResult ? (
          <Button size="xs" onClick={() => onShareResult(session.id)}>
            <Icon name="share" /> Share result
          </Button>
        ) : null}
        {onShareGames ? (
          <Button size="xs" onClick={() => onShareGames(session.id)}>
            <Icon name="share" /> Share games
          </Button>
        ) : null}
        {published ? null : (
          <span className="text-sm text-fg2">
            Share result opens once the club shares the Standings.
          </span>
        )}
      </div>
    )
  }
  return (
    <Tabs
      aria-label="Game type"
      value={activeTab}
      onChange={(v) => onTabChange(v === 'counted' ? 'counted' : 'other')}
      items={[
        {
          value: 'counted',
          label: 'Singles and doubles',
          badges: [{ text: String(counts.counted) }],
        },
        { value: 'other', label: 'Fun and partial', badges: [{ text: String(counts.other) }] },
      ]}
    >
      {(['counted', 'other'] as const).map((tab) => {
        const filter = tab === 'counted' ? gameFilter : null
        const blocks = sessions
          .map((s) => ({
            ...s,
            games: s.games.filter(
              (g) =>
                (g.counting === 'counted') === (tab === 'counted') && (!filter || filter(s, g)),
            ),
          }))
          .filter((s) => s.games.length)
        const pages = Math.max(1, Math.ceil(blocks.length / PER_PAGE))
        const current = Math.min(Math.max(1, pageNow), pages)
        return (
          <TabsContent key={tab} value={tab} className="flex flex-col gap-4">
            {tab === 'other' ? (
              <Notice>
                These games are kept in the record but don't count toward rank or the leaderboard.
              </Notice>
            ) : (
              notices.map((note) => (
                <Notice key={note} tone="warn">
                  {note}
                </Notice>
              ))
            )}
            <Card
              ref={tab === activeTab ? listRef : undefined}
              className="flex flex-col gap-[22px]"
            >
              {blocks.length ? (
                blocks
                  .slice((current - 1) * PER_PAGE, current * PER_PAGE)
                  .map((session) => (
                    <SessionGames
                      key={session.id}
                      session={session}
                      me={me}
                      onOpenPlayer={onOpenPlayer}
                      onShareGame={
                        onShareGame ? (gameId) => onShareGame(session.id, gameId) : undefined
                      }
                      actions={shareRow(session)}
                    />
                  ))
              ) : (
                <p className="py-5 text-center text-sm text-fg2">
                  {filter
                    ? 'No games match this filter.'
                    : tab === 'counted'
                      ? 'No recorded singles or doubles games yet.'
                      : 'No fun or partial games.'}
                </p>
              )}
              {pages > 1 ? (
                <Pager
                  aria-label="Session pages"
                  page={current}
                  pageCount={pages}
                  previousLabel="Newer"
                  nextLabel="Older"
                  summary={`${blocks.length} sessions`}
                  onPage={(next) => {
                    setPage(next)
                    listRef.current?.scrollIntoView({ block: 'start' })
                  }}
                />
              ) : null}
            </Card>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
