import { ResultSlideFrame, type ResultSlideFrameProps } from '@rotra/ui/result-slide-frame'

export type AwardsSlideProps = Omit<ResultSlideFrameProps, 'title' | 'children'> & {
  /** null when fewer than two counted games qualify anyone */
  mvp: { name: string } | null
  /** null when no one has the five-session club history; priorSessions is the N in the copy */
  mostImproved: { name: string; priorSessions: number } | null
  /** Shows the "Prototype formula" footnote while the award maths is unsettled */
  showFormulaNote: boolean
}

const AWARD = 'flex flex-col gap-1 rounded-lg border border-border bg-surface p-3.5'
const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'
const BIG = 'text-[22px] font-extrabold [overflow-wrap:anywhere]'

/**
 * Slide 2 — Awards: the MVP and Most Improved cards (.award) inside the result slide frame.
 * Either award can be empty; the slide then says why. Computes nothing: the names come from the
 * award maths (Q08.4).
 */
export function AwardsSlide({ mvp, mostImproved, showFormulaNote, ...frame }: AwardsSlideProps) {
  return (
    <ResultSlideFrame {...frame} title="Awards">
      <div className="flex flex-col gap-3">
        <div className={AWARD}>
          <span className={LABEL}>MVP</span>
          {mvp ? (
            <>
              <span className={BIG}>{mvp.name}</span>
              <span className="text-[13px] text-fg2">
                Won more than expected for their level, partners and opponents.
              </span>
            </>
          ) : (
            <span className="text-fg2">Not enough counted games to name an MVP.</span>
          )}
        </div>
        <div className={AWARD}>
          <span className={LABEL}>Most Improved</span>
          {mostImproved ? (
            <>
              <span className={BIG}>{mostImproved.name}</span>
              <span className="text-[13px] text-fg2">
                Played above their last {mostImproved.priorSessions} sessions at this club.
              </span>
            </>
          ) : (
            <span className="text-fg2">Not enough recent club-session history.</span>
          )}
        </div>
        {showFormulaNote ? (
          <p className="text-[13px] text-fg2">
            Prototype formula. ROTRA hasn't settled the award maths yet.
          </p>
        ) : null}
      </div>
    </ResultSlideFrame>
  )
}
