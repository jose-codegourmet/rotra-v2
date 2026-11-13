import { AwardCard, type AwardCardProps } from '@rotra/ui/award-card'
import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'

export type PublicAwardEntry = Omit<AwardCardProps, 'tone' | 'label' | 'className'> & {
  /** Stable key */
  id: string
}

export type PublicAwardsProps = {
  /** The club shared the Awards slide */
  awardsShared: boolean
  mvp: PublicAwardEntry | null
  mostImproved: PublicAwardEntry | null
  /** Null when the club did not share Off Day; empty when no one had an off day */
  offDay: PublicAwardEntry[] | null
  /** Share awards: the whole set as one image */
  onShareAwards: () => void
  /** Share Off Day: every Off Day player in one image */
  onShareOffDay: () => void
  /** The “Prototype formula” footnote while the award maths is unsettled */
  showFormulaNote?: boolean
}

const GRID = 'grid grid-cols-2 gap-3.5 max-[560px]:grid-cols-1'

/**
 * Finished session page › Details › **Awards** (2026-11-13-queue-awards-faces-share, passes 2–5;
 * the prototype's pubAwards): a page section, not the result slide. Heading with **Share awards**,
 * the MVP and Most Improved cards side by side (one column under 560 px), then a shared Off Day
 * under its own heading with **Share Off Day**, and the footnote. Renders nothing when there is
 * nothing to show.
 */
export function PublicAwards({
  awardsShared,
  mvp,
  mostImproved,
  offDay,
  onShareAwards,
  onShareOffDay,
  showFormulaNote = true,
}: PublicAwardsProps) {
  const cards = awardsShared
    ? [
        mvp ? <AwardCard key={mvp.id} tone="mvp" label="MVP" {...mvp} /> : null,
        mostImproved ? (
          <AwardCard
            key={mostImproved.id}
            tone="improved"
            label="Most Improved"
            {...mostImproved}
          />
        ) : null,
      ].filter(Boolean)
    : []
  if (!cards.length && !awardsShared && !offDay) return null
  return (
    <section aria-label="Awards" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>Awards</h2>
        {cards.length ? (
          <Button size="sm" onClick={onShareAwards}>
            <Icon name="share" />
            Share awards
          </Button>
        ) : null}
      </div>
      {cards.length ? (
        <div className={GRID}>{cards}</div>
      ) : awardsShared ? (
        <p className="m-0 text-[13px] text-fg2">Not enough counted games to name awards.</p>
      ) : null}
      {offDay ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3>Off Day</h3>
            {offDay.length ? (
              <Button size="sm" onClick={onShareOffDay}>
                <Icon name="share" />
                Share Off Day
              </Button>
            ) : null}
          </div>
          {offDay.length ? (
            <div className={GRID}>
              {offDay.map(({ id, ...entry }) => (
                <AwardCard key={id} tone="off" {...entry} />
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px] text-fg2">No one had an off day by the rule.</p>
          )}
        </>
      ) : null}
      {showFormulaNote ? (
        <p className="m-0 text-[13px] text-fg2">
          Prototype formula. ROTRA hasn't settled the award maths yet.
        </p>
      ) : null}
    </section>
  )
}
