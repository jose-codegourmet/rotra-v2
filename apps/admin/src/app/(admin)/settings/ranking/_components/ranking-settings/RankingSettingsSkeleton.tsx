import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/** One card's title and a few lines as grey bars. */
function CardSkeleton({ lines }: { lines: number }) {
  return (
    <Card className="flex flex-col gap-3">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: lines }, (_, line) => (
        <Skeleton key={`line-${line}`} className={line % 2 ? 'w-1/2' : 'w-3/4'} />
      ))}
    </Card>
  )
}

/**
 * A-RANK-CONFIG while the settings load: the Edit card's fields, Fixed rules, In effect and
 * Versions as grey bars, with no weight, threshold or version number. Shared by loading.tsx and
 * RankingSettings.
 */
export function RankingSettingsSkeleton() {
  return (
    <div
      aria-busy
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <Skeleton label="Loading the ranking settings" className="h-5 w-24" />
          {Array.from({ length: 3 }, (_, field) => (
            <div key={`field-${field}`} className="flex flex-col gap-2">
              <Skeleton className="w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex justify-end gap-2.5">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
        <CardSkeleton lines={4} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="w-3/4" />
        </Card>
        <CardSkeleton lines={2} />
      </div>
    </div>
  )
}
