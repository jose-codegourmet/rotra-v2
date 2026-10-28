import { Skeleton } from '@rotra/ui/skeleton'

export default function AdminLoading() {
  return (
    <>
      <Skeleton label="Loading Admin page" className="h-8 w-52" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-44 w-full" />
    </>
  )
}
