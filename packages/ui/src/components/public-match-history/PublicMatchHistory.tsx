import { MatchCourt, type MatchCourtProps } from '@rotra/ui/match-court'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import type { ReactNode } from 'react'

export type PublicMatchHistoryItem = MatchCourtProps & { id: string }

export type PublicMatchHistoryProps = {
  /** False: a visitor, who sees “Log in with ROTRA Player to see the match history.” */
  signedIn: boolean
  tab: 'mine' | 'all'
  onTabChange: (tab: 'mine' | 'all') => void
  /** “Yours · N” */
  mineCount: number
  /** “All · N”: every match of the session */
  allCount: number
  /** The club shared the results; until then All shows the not-shared line */
  shared: boolean
  /** The open tab's matches as they show now (on All, only those started by the replay's time) */
  items: PublicMatchHistoryItem[]
  /** All, shared: the replay card under “How the night went” */
  replay?: ReactNode
}

const MUTED = 'm-0 text-[13px] text-fg2'

/**
 * Finished session page › Details › **Match history** (2026-11-13 finished session and match
 * history courts logs; the prototype's pubHistory): the heading with the count big and green on
 * the right, **Yours · N** / **All · N**, then one MatchCourt per match, newest first. On All, when
 * the results are shared, **How the night went** (the replay) comes first and the list follows it.
 */
export function PublicMatchHistory({
  signedIn,
  tab,
  onTabChange,
  mineCount,
  allCount,
  shared,
  items,
  replay,
}: PublicMatchHistoryProps) {
  const heading = <h2>Match history</h2>
  if (!signedIn)
    return (
      <section aria-label="Match history" className="flex flex-col gap-3">
        {heading}
        <p className={MUTED}>Log in with ROTRA Player to see the match history.</p>
      </section>
    )
  const hidden = tab === 'all' && !shared
  return (
    <section aria-label="Match history" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {heading}
        {hidden ? null : (
          <span className="inline-flex items-baseline gap-1.5 text-sm font-semibold text-accent">
            <b className="text-[30px] leading-none font-extrabold tabular-nums">{items.length}</b>
            {items.length === 1 ? 'match' : 'matches'}
          </span>
        )}
      </div>
      <SegmentedControl
        aria-label="Match history"
        className="self-start"
        value={tab}
        onChange={(value) => onTabChange(value === 'all' ? 'all' : 'mine')}
        options={[
          { value: 'mine', label: `Yours · ${mineCount}` },
          { value: 'all', label: `All · ${allCount}` },
        ]}
      />
      {hidden ? (
        <p className={MUTED}>
          The club hasn't shared the results yet. Every match shows here once they do.
        </p>
      ) : (
        <>
          {tab === 'all' && replay && allCount > 0 ? (
            <div className="flex flex-col gap-2">
              <h3>How the night went</h3>
              <p className={MUTED}>
                Press play or drag the timeline to see every court at any moment of the night. The
                matches on court light up below.
              </p>
              {replay}
            </div>
          ) : null}
          {items.length ? (
            <div className="flex flex-col gap-3">
              {items.map(({ id, ...match }) => (
                <MatchCourt key={id} {...match} />
              ))}
            </div>
          ) : tab === 'all' && allCount > 0 ? null : (
            <p className="m-0 text-fg2">
              {tab === 'mine' ? "You didn't play a match in this session." : 'No matches recorded.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
