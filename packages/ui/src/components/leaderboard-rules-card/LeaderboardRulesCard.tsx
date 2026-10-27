import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
export function LeaderboardRulesCard({
  matchRequirement,
  onOpenRankDetail,
}: {
  matchRequirement: number
  onOpenRankDetail: () => void
}) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>Who appears here</h2>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-fg2">
          <li>
            Players with{' '}
            <b className="text-fg">{matchRequirement} completed singles or doubles matches</b> in
            the last three months. It&apos;s a rolling count, not a lifetime total.
          </li>
          <li>
            Fun games, partial games after a substitution, and invalid games or sessions don&apos;t
            count.
          </li>
          <li>
            After three months without playing, a player leaves the list until a club reassesses
            them.
          </li>
          <li>Positions come from club assessments and match results.</li>
        </ul>
        <Button variant="ghost" size="xs" onClick={onOpenRankDetail}>
          How ranks work
        </Button>
      </section>
    </Card>
  )
}
