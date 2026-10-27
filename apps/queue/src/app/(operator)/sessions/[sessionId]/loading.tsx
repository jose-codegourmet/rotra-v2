import { Skeleton } from '@rotra/ui/skeleton'

/** Route skeleton while a session screen's server shell loads; no fabricated names or counts. */
export default function SessionLoading() {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <Skeleton className="w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="w-72" />
      <Skeleton className="h-10" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </main>
  )
}
