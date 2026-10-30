import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/**
 * A-CLUB-DETAIL while the club loads: the hero (logo, name, chips), the four tabs and the first
 * panel as grey bars, with no club name, price or count. Shared by loading.tsx and ClubDetail.
 */
export function ClubDetailSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-[52px] flex-none rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton label="Loading the club" className="h-7 w-56 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-5 border-b border-border pb-2.5">
        <Skeleton className="w-20" />
        <Skeleton className="w-16" />
        <Skeleton className="w-24" />
        <Skeleton className="w-16" />
      </div>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="w-3/4" />
        <Skeleton className="w-1/2" />
      </Card>
    </div>
  )
}
