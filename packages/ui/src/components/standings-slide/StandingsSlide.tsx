import { cn } from '@rotra/ui/cn'
import { ResultSlideFrame, type ResultSlideFrameProps } from '@rotra/ui/result-slide-frame'

export type StandingsSlideRow = {
  /** Unique position, 1-based */
  position: number
  name: string
  wins: number
  losses: number
  games: number
}

export type StandingsSlideProps = Omit<ResultSlideFrameProps, 'title' | 'children'> & {
  /** Players with at least one counted game, already ordered (Q08.4 computes this) */
  rows: StandingsSlideRow[]
}

const TH = 'px-1.5 py-1 text-left text-[11px] tracking-[0.6px] text-fg2 uppercase'
const TD = 'border-b border-border px-1.5 py-[7px]'
const NUM = 'w-[42px] text-right'

/**
 * Slide 1 — Standings: the prototype's .st-table (#, Player, W, L, G) inside the result slide
 * frame, with tabular numbers and the leader in accent. Read-only; shows the empty copy when no
 * counted games were recorded.
 */
export function StandingsSlide({ rows, ...frame }: StandingsSlideProps) {
  return (
    <ResultSlideFrame {...frame} title="Standings">
      {rows.length ? (
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border-strong">
              <th scope="col" className={TH}>
                #
              </th>
              <th scope="col" className={TH}>
                Player
              </th>
              <th scope="col" className={cn(TH, NUM)}>
                W
              </th>
              <th scope="col" className={cn(TH, NUM)}>
                L
              </th>
              <th scope="col" className={cn(TH, NUM)}>
                G
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.position}-${r.name}`}
                className={cn(i === 0 && 'font-bold text-accent')}
              >
                <td className={TD}>{r.position}</td>
                <td className={cn(TD, '[overflow-wrap:anywhere]')}>{r.name}</td>
                <td className={cn(TD, NUM)}>{r.wins}</td>
                <td className={cn(TD, NUM)}>{r.losses}</td>
                <td className={cn(TD, NUM)}>{r.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-3 py-6 text-center text-sm text-fg2">
          No counted games were recorded in this session.
        </p>
      )}
    </ResultSlideFrame>
  )
}
