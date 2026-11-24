import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** Shaped like Hi NAME, Current session and the two columns; no invented values. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-[1240px] px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px]">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-1/3" />
        <Card aria-busy="true" aria-label="Loading current session">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="mt-3 h-10" />
        </Card>
        <div className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-40" />
            <Skeleton className="h-36" />
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-40" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    </main>
  )
}
