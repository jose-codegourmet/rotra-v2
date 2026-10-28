import { AuthCard } from '@rotra/ui/auth-card'
import { Skeleton } from '@rotra/ui/skeleton'
/** Sign-in, recovery and registration pages: a card-shaped placeholder, no form until it's ready. */
export default function Loading() {
  return (
    <AuthCard showBrand={false} title={<Skeleton className="h-7" />}>
      <div role="status" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-11" />
        <Skeleton className="mt-4 h-11" />
      </div>
    </AuthCard>
  )
}
