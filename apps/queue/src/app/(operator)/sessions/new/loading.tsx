import { Skeleton } from '@rotra/ui/skeleton'

export default function NewSessionLoading() {
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <Skeleton className="w-16" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10" />
      <Skeleton className="h-96 rounded-lg" />
    </main>
  )
}
