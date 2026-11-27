'use client'

import { Button } from '@rotra/ui/button'
import { CardCarousel, SINGLE_SLIDE_CLASS } from '@rotra/ui/card-carousel'
import { Icon } from '@rotra/ui/icon'
import { MatchCard, type MatchCardProps } from '@rotra/ui/match-card'
import { Sheet } from '@rotra/ui/sheet'

/**
 * One waiting match as the Put a match on Court N carousel draws it: the compact MatchCard's own
 * facts (status already worked out from matchStatus) plus the match id the callbacks report.
 */
export type ChooseMatchItem = Pick<
  MatchCardProps,
  | 'position'
  | 'matchNo'
  | 'format'
  | 'categoryPrefix'
  | 'origin'
  | 'manualProtected'
  | 'status'
  | 'teamA'
  | 'teamB'
  | 'canOpenCourt'
  | 'onSelectPlayer'
> & { matchId: string }

export type ChooseMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The free court's label, e.g. "Court 2" */
  courtLabel: string
  /** Every waiting match in queue order, status included */
  matches: ChooseMatchItem[]
  /** Put on court: the match goes on this court, getting ready; it is started from the court */
  onPutOnCourt: (matchId: string) => void
  /** Edit: opens the lineup editor for that match */
  onEdit: (matchId: string) => void
  /** Footer "← Back": returns to Court N is free */
  onBack: () => void
}

/**
 * Q-CHOOSE-MATCH, "Put a match on Court N" (prototype SHEETS.chooseMatch): the waiting Main Queue
 * matches as compact MatchCards in a CardCarousel (one a slide, the next peeking, arrows, dots, side
 * masks while more are that way). Each card shows only Put on court (disabled while the match can't
 * start) and Edit. No remove, no reorder handle, no flow arrow, no player swap-drag: a drag anywhere
 * on a card swipes. Queue order is a suggestion, not a rule.
 */
export function ChooseMatchSheet({
  open,
  onOpenChange,
  courtLabel,
  matches,
  onPutOnCourt,
  onEdit,
  onBack,
}: ChooseMatchSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Put a match on ${courtLabel}`}
      footer={
        <Button onClick={onBack}>
          <Icon name="back" />
          Back
        </Button>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        Any ready match can go next. Queue order is a suggestion, not a rule. It goes on court
        getting ready; you start it from the court.
      </p>
      {matches.length ? (
        <CardCarousel
          label="Matches"
          previousLabel="Previous match"
          nextLabel="Next match"
          dotLabel={(n) => `Go to match ${n}`}
          slideClassName={SINGLE_SLIDE_CLASS}
          items={matches.map(({ matchId, ...card }) => ({
            id: matchId,
            node: (
              <MatchCard
                {...card}
                variant="compact"
                slide
                startLabel="Put on court"
                startAriaLabel={`Put on ${courtLabel}`}
                onStart={() => onPutOnCourt(matchId)}
                onEdit={() => onEdit(matchId)}
              />
            ),
          }))}
        />
      ) : (
        <p className="m-0 rounded-md border border-dashed border-border-strong px-3 py-6 text-center text-sm text-fg2">
          The Main Queue is empty.
        </p>
      )}
    </Sheet>
  )
}
