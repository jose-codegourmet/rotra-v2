import { Card } from '@rotra/ui/card'
import { ProfileLayout } from '@rotra/ui/profile-layout'
import { Skeleton } from '@rotra/ui/skeleton'
/** Shaped like the identity, shared rank, eligibility and recent games cards; no invented values. */
export default function Loading() {
  return (
    <ProfileLayout
      side={
        <Card aria-busy="true" aria-label="Loading player identity">
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-[88px] flex-none rounded-[20px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-7" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-11" />
        </Card>
      }
      main={
        <>
          <Card aria-busy="true" aria-label="Loading shared rank">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="mt-4 h-10" />
            <Skeleton className="mt-4 h-4" />
          </Card>
          <Card aria-busy="true" aria-label="Loading leaderboard eligibility">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="mt-3 h-2" />
          </Card>
          <Card aria-busy="true" aria-label="Loading recent games">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-4 h-12" />
            <Skeleton className="mt-2 h-12" />
          </Card>
        </>
      }
    />
  )
}
