import { Card } from '@rotra/ui/card'
import { useId } from 'react'

/**
 * Ranking settings (A-RANK-CONFIG): the ranking rules Admin can't adjust, shown next to the editable
 * settings for context.
 */
export function FixedRulesCard() {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId}>Fixed rules</h2>
          <p className="m-0 text-[13px] text-fg2">
            Shown for context. These aren&apos;t adjustable in Admin.
          </p>
        </div>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm">
          <li>Each club&apos;s latest assessment of a player counts equally.</li>
          <li>The rank looks back over three months.</li>
          <li>
            Most Improved and Off Day need five earlier sessions at the same club within those three
            months.
          </li>
          <li>
            Fun games, partial games and invalid matches don&apos;t count toward the leaderboard
            requirement.
          </li>
        </ul>
      </section>
    </Card>
  )
}
