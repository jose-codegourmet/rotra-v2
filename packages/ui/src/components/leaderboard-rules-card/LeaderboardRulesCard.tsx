import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
export function LeaderboardRulesCard({ onOpenRankDetail }: { onOpenRankDetail: () => void }) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-2">
        <h2>Who appears here</h2>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm text-fg2">
          <li>
            <b className="text-fg">Top annual, Top monthly and Top weekly</b> each list the{' '}
            <b className="text-fg">50 players with the most wins</b> in standard matches in that
            year, month or week. Nothing else decides who is listed. Win rate breaks a tie.
          </li>
          <li>Each list starts again when a new year, month or week begins.</li>
          <li>
            Fun games, partial games after a substitution, games from not-ranked sessions, and
            invalid games or sessions don&apos;t count.
          </li>
          <li>
            The mark beside a place shows the move since the period before: up, down, or{' '}
            <b className="text-fg">New</b> when the player wasn&apos;t on that list then. Point at
            it to see their earlier place.
          </li>
          <li>
            Players marked <b className="text-fg">Not registered yet</b> were saved by one club and
            haven&apos;t registered with ROTRA. A player saved by more than one club joins the list
            after they register.
          </li>
          <li>
            A player&apos;s skill rank is separate and isn&apos;t shown here.{' '}
            <Button variant="ghost" size="xs" onClick={onOpenRankDetail}>
              How ranks work
            </Button>
          </li>
        </ul>
      </section>
    </Card>
  )
}
