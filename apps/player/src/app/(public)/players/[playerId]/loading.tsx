import { Card } from '@rotra/ui/card'
import { ProfileLayout } from '@rotra/ui/profile-layout'
import { Skeleton } from '@rotra/ui/skeleton'
export default function Loading() {
  return <ProfileLayout side={<Card aria-busy="true" aria-label="Loading player identity"><Skeleton className="h-24" /><Skeleton className="mt-4 h-12" /></Card>} main={<Card aria-busy="true" aria-label="Loading player rank and games"><Skeleton className="h-52" /><Skeleton className="mt-5 h-52" /></Card>} />
}
