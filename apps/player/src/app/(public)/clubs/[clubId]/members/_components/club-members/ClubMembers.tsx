'use client'
import { type ClubMemberBand, filterClubMembers } from '@rotra/data/club-page/rules'
import { useClubPage } from '@rotra/data/club-page/useClubPage'
import { Button } from '@rotra/ui/button'
import { ClubMemberList } from '@rotra/ui/club-member-list'
import { ErrorState } from '@rotra/ui/error-state'
import { levelLabel } from '@rotra/ui/level-pill'
import { Skeleton } from '@rotra/ui/skeleton'
import { notFound, useRouter } from 'next/navigation'
import { useState } from 'react'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { MemberProfile } from '../../../_components/member-profile/MemberProfile'

const num = (n: number) => n.toLocaleString('en-US')

/** P-CLUB-MEMBERS: every registered member of a club, like Queue › Saved players (#737). */
export function ClubMembers({ clubId }: { clubId: string }) {
  const router = useRouter()
  const page = useClubPage(clubId)
  const [query, setQuery] = useState('')
  const [band, setBand] = useState<ClubMemberBand>('all')
  const [openKey, setOpenKey] = useState<string | null>(null)
  if (page.data === null) notFound()
  if (!page.data)
    return page.isError ? (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState
          title="Couldn't load the club's members."
          retryLabel="Retry"
          retrying={page.isFetching}
          onRetry={() => void page.refetch()}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <main
        aria-busy="true"
        aria-label="Loading the club's members"
        className="mx-auto flex w-full max-w-[920px] flex-col gap-5 px-4 pt-5"
      >
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </main>
    )
  const { club, members, signedIn } = page.data
  const rows = filterClubMembers(members, query, band)
  const total = members.length
  return (
    <main className="mx-auto flex w-full max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => router.push(`/clubs/${encodeURIComponent(club.id)}`)}
        >
          ← {club.name}
        </Button>
        <h1>Members</h1>
        <p className="m-0 text-fg2">
          {club.name} · {num(total)} registered member{total === 1 ? '' : 's'}.
          {signedIn ? '' : ' Names are masked. Sign in with ROTRA to see them.'}
        </p>
      </div>
      <ClubMemberList
        rows={rows.map((m) => ({
          key: m.key,
          name: m.name,
          picture: pictureSrc(m.picture, m.playerId ?? m.key, m.name) ?? null,
          levelLabel: levelLabel(m.level),
          isYou: m.isYou,
          openable: signedIn && !m.masked,
        }))}
        totalCount={total}
        query={query}
        band={band}
        onQueryChange={setQuery}
        onBandChange={setBand}
        onClear={() => {
          setQuery('')
          setBand('all')
        }}
        onOpen={setOpenKey}
      />
      <MemberProfile
        member={members.find((m) => m.key === openKey) ?? null}
        onClose={() => setOpenKey(null)}
      />
    </main>
  )
}
