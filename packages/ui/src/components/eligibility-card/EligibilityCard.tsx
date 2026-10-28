import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ProgressBar } from '@rotra/ui/progress-bar'

export function EligibilityCard({
  recentCount,
  matchRequirement,
  needsReassessment = false,
  sentence,
}: {
  recentCount: number
  matchRequirement: number
  needsReassessment?: boolean
  sentence?: string
}) {
  const qualifies = recentCount >= matchRequirement && !needsReassessment
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-between gap-2">
        <h2>Leaderboard eligibility</h2>
        <Chip tone={qualifies ? 'accent' : needsReassessment ? 'warn' : 'neutral'}>
          {qualifies ? 'Qualifies' : 'Not yet'}
        </Chip>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-mono text-[22px] font-semibold">
          {recentCount} <span className="text-[15px] text-fg2">of {matchRequirement}</span>
        </span>
        <span className="text-[13px] text-fg2">standard matches · last three months</span>
      </div>
      <ProgressBar
        value={recentCount}
        max={matchRequirement}
        tone={needsReassessment ? 'warn' : 'accent'}
        aria-label="Standard matches in the last three months"
      />
      {sentence ? <p className="m-0 text-[13px] text-fg2">{sentence}</p> : null}
      <p className="m-0 text-[13px] text-fg2">
        Fun games, partial games after a substitution, and invalid games or sessions don&apos;t
        count.
      </p>
    </Card>
  )
}
