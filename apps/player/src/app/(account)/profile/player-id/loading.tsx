import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'
/** Shaped like the QR card and 'What the ID means'; no placeholder ID is drawn. */
export default function Loading() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Card aria-busy="true" aria-label="Loading your player ID" className="flex flex-col gap-4">
        <Skeleton className="aspect-square w-[min(260px,100%)] self-center rounded-[16px]" />
        <Skeleton className="h-7 w-2/3 self-center" />
        <Skeleton className="h-9 w-24 self-center" />
      </Card>
      <Card aria-busy="true" aria-label="Loading what the ID means">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-3 h-14" />
      </Card>
    </main>
  )
}
