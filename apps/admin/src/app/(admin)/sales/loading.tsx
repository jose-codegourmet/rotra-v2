import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** A-SALES while the route loads: header, period switch, three number cards and the lists as grey bars. */
export default function SalesLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton label="Loading sales" className="h-8 w-40" />
        <Skeleton className="w-3/4" />
      </div>
      <Skeleton className="h-10 w-80 max-w-full" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
        {Array.from({ length: 3 }, (_, card) => (
          <Card key={`skeleton-${card}`} aria-busy className="flex flex-col gap-3">
            <Skeleton className="w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 w-full" />
          </Card>
        ))}
      </div>
      <Card aria-busy className="flex flex-col gap-3">
        <Skeleton className="w-40" />
        <Skeleton className="w-2/3" />
        <Skeleton className="w-1/2" />
      </Card>
    </>
  )
}
