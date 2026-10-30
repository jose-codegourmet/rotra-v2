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
 * A-CONTACT-REVIEW while the request loads: the status chip and title, the requested change and
 * checks, and the current contacts and approval scope as grey bars, with no name, RTR ID or contact.
 * Shared by loading.tsx and ContactReview.
 */
export function ContactReviewSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton label="Loading the request" className="h-8 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[1040px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={4} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </div>
  )
}
