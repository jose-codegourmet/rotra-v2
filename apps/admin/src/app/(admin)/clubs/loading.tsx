import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** A-CLUBS while the route loads: header, search and filter, and table rows as grey bars. */
export default function ClubsLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton label="Loading clubs" className="h-8 w-60" />
        <Skeleton className="w-3/4" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="h-10 min-w-0 flex-[1_1_260px]" />
        <Skeleton className="h-10 w-72 max-w-full" />
      </div>
      <Card aria-busy className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={`skeleton-${row}`} className="flex items-center gap-3">
            <Skeleton className="size-9 flex-none rounded-lg" />
            <Skeleton className="w-40" />
            <Skeleton className="ml-auto w-16" />
            <Skeleton className="w-16" />
          </div>
        ))}
      </Card>
    </>
  )
}
