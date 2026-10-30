import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** One card's title and a few lines as grey bars. */
function CardSkeleton({ lines }: { lines: number }) {
  return (
    <Card className="flex flex-col gap-3">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: lines }, (_, line) => (
        <Skeleton key={`line-${line}`} className={line % 2 ? 'w-1/2' : 'w-3/4'} />
      ))}
    </Card>
  )
}

/**
 * A-PLAYER-DETAIL while the player loads: the hero (avatar, name, chips, RTR ID) and both card
 * columns as grey bars, with no name, RTR ID, contact or count. Shared by loading.tsx and PlayerDetail.
 */
export function PlayerDetailSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-[52px] flex-none rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton label="Loading the player" className="h-7 w-56 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={2} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <CardSkeleton lines={1} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </div>
  )
}
