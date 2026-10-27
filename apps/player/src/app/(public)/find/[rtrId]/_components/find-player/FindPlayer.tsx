'use client'
import { useFindPlayerByRtrId } from '@rotra/data/player/useFindPlayerByRtrId'
import { Button } from '@rotra/ui/button'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { Skeleton } from '@rotra/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
export function FindPlayer({ rtrId }: { rtrId: string }) {
  const router = useRouter(), lookup = useFindPlayerByRtrId(rtrId)
  useEffect(() => { if (lookup.data) router.replace(`/players/${lookup.data.playerId}`) }, [lookup.data, router])
  return <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Button variant="ghost" size="sm" onClick={() => router.push('/')}>← Leaderboard</Button>
    {lookup.isError ? <ErrorState title="Couldn't find the profile." onRetry={() => void lookup.refetch()} retrying={lookup.isFetching}>Check your connection, then try again.</ErrorState> : lookup.isPending || lookup.data ? <Skeleton className="h-24" /> : <><PageHeader title="RTR ID lookup" /><ProfileNotFound id={rtrId} /></>}
  </main>
}
