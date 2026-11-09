import { cn } from '@rotra/ui/cn'

const TIERS = ['Beginner', 'Intermediate', 'Advanced']
const STEPS = ['Low', 'Mid', 'High']
/** Existing shared-rank card API uses levels 1–9; data projections use indexes 0–8. */
export function SkillLadder({
  level,
  stale = false,
  shareCard = false,
}: {
  level: number | null
  stale?: boolean
  shareCard?: boolean
}) {
  const index = level === null ? null : level - 1
  const label =
    index === null
      ? 'No rank on the skill ladder yet'
      : `${TIERS[Math.floor(index / 3)]} ${STEPS[index % 3]}: level ${level} of 9`
  return (
    <div role="img" aria-label={label} className="flex gap-2.5">
      {TIERS.map((tier, tierIndex) => (
        <div key={tier} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex gap-[3px]">
            {STEPS.map((step, stepIndex) => {
              const currentIndex = tierIndex * 3 + stepIndex
              return (
                <i
                  key={step}
                  data-share-cell={
                    shareCard ? (index === currentIndex ? 'current' : 'cell') : undefined
                  }
                  className={cn(
                    'block h-2.5 min-w-0 flex-1 rounded-[2px] bg-elev',
                    shareCard && 'bg-share-fg/10',
                    shareCard && index !== null && currentIndex <= index && 'bg-share-accent/30',
                    shareCard &&
                      index === currentIndex &&
                      'bg-share-accent ring-share-accent ring-offset-share-bg',
                    !shareCard &&
                      index !== null &&
                      currentIndex < index &&
                      (stale ? 'bg-warn/25' : 'bg-accent/30'),
                    !shareCard &&
                      index === currentIndex &&
                      (stale
                        ? 'bg-warn ring-2 ring-warn ring-offset-2 ring-offset-surface'
                        : 'bg-accent ring-2 ring-accent ring-offset-2 ring-offset-surface'),
                  )}
                />
              )
            })}
          </div>
          <span
            data-qr-text={shareCard || undefined}
            className={cn(
              shareCard && 'text-share-muted',
              'text-[11px] font-semibold tracking-[0.5px] text-fg2 uppercase',
            )}
          >
            {tier}
          </span>
        </div>
      ))}
    </div>
  )
}
