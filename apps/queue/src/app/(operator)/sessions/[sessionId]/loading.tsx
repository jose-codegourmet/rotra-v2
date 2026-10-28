import { Skeleton } from '@rotra/ui/skeleton'

/**
 * Route skeleton while a session screen's server shell loads: the header (label, title, venue
 * line), the view tabs, three court-sized cards and a queue card row. No fabricated names, counts
 * or times; the console's own containers show their panel skeletons once the shell is up.
 */
export default function SessionLoading() {
  return (
    <main
      aria-busy
      aria-label="Loading the session"
      className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[170px]"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="w-72" />
      </div>
      <Skeleton className="h-11 w-full max-w-[560px] rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-20" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </main>
  )
}
