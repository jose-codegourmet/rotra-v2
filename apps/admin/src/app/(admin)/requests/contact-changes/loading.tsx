import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** A-CONTACT-REQUESTS while the route loads: header, status filter and table rows as grey bars. */
export default function ContactChangesLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton label="Loading contact changes" className="h-8 w-56" />
        <Skeleton className="w-3/4" />
      </div>
      <Skeleton className="h-10 w-[30rem] max-w-full" />
      <Card aria-busy className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={`skeleton-${row}`} className="flex items-center gap-3">
            <Skeleton className="size-9 flex-none rounded-full" />
            <Skeleton className="w-40" />
            <Skeleton className="ml-auto w-24" />
            <Skeleton className="w-20" />
          </div>
        ))}
      </Card>
    </>
  )
}
