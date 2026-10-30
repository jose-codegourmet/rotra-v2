import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** A-PLAYERS while the route loads: header, search and filter, and table rows as grey bars. */
export default function PlayersLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton label="Loading players" className="h-8 w-40" />
        <Skeleton className="w-3/4" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="h-10 min-w-0 flex-[1_1_260px]" />
        <Skeleton className="h-10 w-64 max-w-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <Card aria-busy className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={`skeleton-${row}`} className="flex items-center gap-3">
            <Skeleton className="size-9 flex-none rounded-full" />
            <Skeleton className="w-40" />
            <Skeleton className="ml-auto w-28" />
            <Skeleton className="w-20" />
          </div>
        ))}
      </Card>
    </>
  )
}
