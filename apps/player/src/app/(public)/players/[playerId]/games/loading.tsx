import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'
export default function Loading() {
  return <main aria-busy="true" aria-label="Loading game history" className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Skeleton className="h-20 w-3/4" /><Skeleton className="h-12" />
    <Card className="flex flex-col gap-5"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40" /></Card>
  </main>
}
