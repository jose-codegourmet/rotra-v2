import { Card } from '@rotra/ui/card'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
export default function Loading() {
  return (
    <main className="mx-auto max-w-[920px] px-4 pt-5 pb-[120px]">
      <Card>
        <LeaderboardList loading />
      </Card>
    </main>
  )
}
