import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { ResultSlideFrame, type ResultSlideFrameProps } from '@rotra/ui/result-slide-frame'

export type AwardsSlideWinner = {
  name: string
  /** The winner's picture; initials without one */
  pictureUrl?: string | null
}

export type AwardsSlideProps = Omit<ResultSlideFrameProps, 'title' | 'children'> & {
  /** null when fewer than two counted games qualify anyone */
  mvp: AwardsSlideWinner | null
  /** null when no one has the five-session club history; priorSessions is the N in the copy */
  mostImproved: (AwardsSlideWinner & { priorSessions: number }) | null
  /** Shows the "Prototype formula" footnote while the award maths is unsettled */
  showFormulaNote: boolean
  /** Share on each award (2026-11-13-queue-awards-faces-share): opens Share MVP / Share Most Improved */
  onShare?: (award: 'mvp' | 'mostImproved') => void
}

const AWARD = 'flex flex-col gap-1 rounded-lg border border-border bg-surface p-3.5'
const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'
const BIG = 'text-[22px] font-extrabold [overflow-wrap:anywhere]'

/**
 * Slide 2 — Awards: the MVP and Most Improved cards (.award) inside the result slide frame, each
 * with the winner's picture left of the text (60 px; MVP 68 px with an accent ring) and a Share
 * button that wraps under the text on phones (2026-11-13-queue-awards-faces-share). Either award
 * can be empty; the slide then says why. Computes nothing: the names come from the award maths.
 */
export function AwardsSlide({
  mvp,
  mostImproved,
  showFormulaNote,
  onShare,
  ...frame
}: AwardsSlideProps) {
  const row = (
    award: 'mvp' | 'mostImproved',
    label: string,
    winner: AwardsSlideWinner,
    reason: string,
  ) => (
    <div className={cn(AWARD, 'flex-row flex-wrap items-center gap-3.5')}>
      <Avatar
        name={winner.name}
        src={winner.pictureUrl ?? undefined}
        size={64}
        className={cn(
          'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--border-strong)]',
          award === 'mvp'
            ? 'size-[68px] text-[22px] shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]'
            : 'size-[60px] text-xl',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={LABEL}>{label}</span>
        <span className={BIG}>{winner.name}</span>
        <span className="text-[13px] text-fg2">{reason}</span>
      </div>
      {onShare ? (
        <Button
          size="sm"
          className="shrink-0 max-[480px]:ml-[74px]"
          aria-label={`Share ${label}: ${winner.name}`}
          onClick={() => onShare(award)}
        >
          <Icon name="share" />
          Share
        </Button>
      ) : null}
    </div>
  )
  return (
    <ResultSlideFrame {...frame} title="Awards">
      <div className="flex flex-col gap-3">
        {mvp ? (
          row('mvp', 'MVP', mvp, 'Won more than expected for their level, partners and opponents.')
        ) : (
          <div className={AWARD}>
            <span className={LABEL}>MVP</span>
            <span className="text-fg2">Not enough counted games to name an MVP.</span>
          </div>
        )}
        {mostImproved ? (
          row(
            'mostImproved',
            'Most Improved',
            mostImproved,
            `Played above their last ${mostImproved.priorSessions} sessions at this club.`,
          )
        ) : (
          <div className={AWARD}>
            <span className={LABEL}>Most Improved</span>
            <span className="text-fg2">Not enough recent club-session history.</span>
          </div>
        )}
        {showFormulaNote ? (
          <p className="text-[13px] text-fg2">
            Prototype formula. ROTRA hasn't settled the award maths yet.
          </p>
        ) : null}
      </div>
    </ResultSlideFrame>
  )
}
