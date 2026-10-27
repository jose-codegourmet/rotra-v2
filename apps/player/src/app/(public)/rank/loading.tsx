import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'
export default function Loading() {
  return <main aria-busy="true" aria-label="Loading rank details" className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Skeleton className="h-20 w-3/4" />
    <Card className="flex flex-col gap-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4" /><Skeleton className="h-40" /></Card>
    <Card className="flex flex-col gap-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-32" /></Card>
  </main>
}
