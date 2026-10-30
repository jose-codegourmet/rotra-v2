import { Card } from '@rotra/ui/card'
import { Skeleton } from '@rotra/ui/skeleton'

/**
 * A-FEATURE-FLAGS while the catalog loads: flag rows (name, chip, description, last change and a
 * switch) as grey bars, with no name, key or value. Shared by loading.tsx and FeatureFlags.
 */
export function FeatureFlagsSkeleton() {
  return (
    <Card aria-busy className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, row) => (
        <div key={`skeleton-${row}`} className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton
                label={row === 0 ? 'Loading the feature flags' : undefined}
                className="w-40"
              />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="w-3/4" />
            <Skeleton className="w-1/2" />
          </div>
          <Skeleton className="h-6 w-11 flex-none rounded-full" />
        </div>
      ))}
    </Card>
  )
}
