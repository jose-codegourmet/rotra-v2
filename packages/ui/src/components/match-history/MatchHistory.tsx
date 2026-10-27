'use client'
import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { SessionGames } from '@rotra/ui/session-games'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
export type MatchHistoryProps = {
  sessions: PlayerSessionRecord[]
  activeTab: 'counted' | 'other'
  onTabChange: (tab: 'counted' | 'other') => void
  notices?: string[]
}
export function MatchHistory({
  sessions,
  activeTab,
  onTabChange,
  notices = [],
}: MatchHistoryProps) {
  const counts = sessions
    .flatMap((s) => s.games)
    .reduce(
      (n, g) => {
        n[g.counting === 'counted' ? 'counted' : 'other']++
        return n
      },
      { counted: 0, other: 0 },
    )
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
        const blocks = sessions
          .map((s) => ({
            ...s,
            games: s.games.filter((g) => (g.counting === 'counted') === (tab === 'counted')),
          }))
          .filter((s) => s.games.length)
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
            <Card className="flex flex-col gap-[22px]">
              {blocks.length ? (
                blocks.map((session) => <SessionGames key={session.id} session={session} />)
              ) : (
                <p className="py-5 text-center text-sm text-fg2">
                  {tab === 'counted'
                    ? 'No recorded singles or doubles games yet.'
                    : 'No fun or partial games.'}
                </p>
              )}
            </Card>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
