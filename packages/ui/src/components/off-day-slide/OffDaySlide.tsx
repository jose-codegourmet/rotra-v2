import { Icon } from '@rotra/ui/icon'
import { ResultSlideFrame, type ResultSlideFrameProps } from '@rotra/ui/result-slide-frame'
import type { OffDaySlideVariants } from './OffDaySlide.variants'

export type OffDaySlideRow = {
  name: string
  /** The N in "across their last N club sessions" */
  priorSessions: number
}

export type OffDaySlideProps = Omit<ResultSlideFrameProps, 'title' | 'children'> &
  OffDaySlideVariants & {
    /** Eligible below-baseline players (Q08.4 computes this); empty when nobody qualifies */
    rows: OffDaySlideRow[]
  }

/**
 * Slide 3 — Off Day: the eligible below-baseline players inside the result slide frame. The
 * private variant (the default) carries the "Private · not included in sharing" band; the public
 * variant, shown only after explicit inclusion in a publication, never does.
 */
export function OffDaySlide({ rows, variant = 'private', ...frame }: OffDaySlideProps) {
  return (
    <ResultSlideFrame {...frame} title="Off Day">
      {variant === 'private' ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-warn p-1.5 text-[13px] font-bold text-warn">
          <Icon name="lock" size={13} />
          Private · not included in sharing
        </div>
      ) : null}
      {rows.length ? (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div
              key={r.name}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3.5"
            >
              <b className="[overflow-wrap:anywhere]">{r.name}</b>
              <span className="text-[13px] text-fg2">
                Below their usual results across their last {r.priorSessions} club sessions.
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-3 py-6 text-center text-sm text-fg2">
          No one had an off day by the recent-history measure.
        </p>
      )}
      <p className="text-[13px] text-fg2">
        Only players with 5+ sessions here in the last 3 months are compared. Prototype formula.
      </p>
    </ResultSlideFrame>
  )
}
