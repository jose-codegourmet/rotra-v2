import { Skeleton } from '@rotra/ui/skeleton'

export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading settings"
      className="mx-auto flex max-w-[640px] flex-col gap-4 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px]"
    >
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-full max-w-96" />
      </div>
      <Skeleton className="h-60" />
      <Skeleton className="h-28" />
      <Skeleton className="h-11 w-24" />
    </main>
  )
}
