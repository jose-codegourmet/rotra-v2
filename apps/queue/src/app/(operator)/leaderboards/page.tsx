import { Suspense } from 'react'
import { Leaderboards } from './_components/leaderboards/Leaderboards'

export default function LeaderboardsPage() {
  return (
    <Suspense>
      <Leaderboards />
    </Suspense>
  )
}
