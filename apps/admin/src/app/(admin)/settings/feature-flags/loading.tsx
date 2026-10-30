import { Skeleton } from '@rotra/ui/skeleton'
import { FeatureFlagsSkeleton } from './_components/feature-flags/FeatureFlagsSkeleton'

/** A-FEATURE-FLAGS while the route loads: header, Add flag and flag rows as grey bars. */
export default function FeatureFlagsLoading() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <FeatureFlagsSkeleton />
    </>
  )
}
