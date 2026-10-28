import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'
/** Shaped like the Phone privacy, Contact details and Sign out cards; no contact values. */
export default function Loading() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-8 w-1/2" />
      </div>
      <Card aria-busy="true" aria-label="Loading phone privacy">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-3 h-12" />
        <Skeleton className="mt-3 h-4 w-2/3" />
      </Card>
      <Card aria-busy="true" aria-label="Loading contact details">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-3 h-10" />
        <Skeleton className="mt-3 h-9 w-36" />
      </Card>
      <Card aria-busy="true" aria-label="Loading sign out">
        <Skeleton className="h-10" />
      </Card>
    </main>
  )
}
