import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ProgressBar } from '@rotra/ui/progress-bar'

export function EligibilityCard({
  recentCount,
  matchRequirement,
  needsReassessment = false,
}: {
  recentCount: number
  matchRequirement: number
  needsReassessment?: boolean
}) {
  const qualifies = recentCount >= matchRequirement && !needsReassessment
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-between gap-2">
        <h2>Leaderboard eligibility</h2>
        <Chip tone={qualifies ? 'accent' : 'warn'}>{qualifies ? 'Qualifies' : 'Not yet'}</Chip>
      </div>
      <b className="font-mono text-2xl">
        {recentCount} of {matchRequirement}
      </b>
      <span className="text-sm text-fg2">standard matches · last three months</span>
      <ProgressBar
        value={recentCount}
        max={matchRequirement}
        tone={needsReassessment ? 'warn' : 'accent'}
        aria-label="Standard matches in the last three months"
      />
      <p className="m-0 text-sm text-fg2">
        Fun games, partial games after a substitution, and invalid games or sessions don&apos;t
        count.
      </p>
    </Card>
  )
}
