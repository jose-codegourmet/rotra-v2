import { dataMode } from '@rotra/api-proxy/data-mode'
import { clubs } from '@rotra/data/fixtures/clubs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ClubLeaderboard } from './_components/club-leaderboard/ClubLeaderboard'

/** P-CLUB-LEADERBOARD (D-2026-11-25-04): public, served per request, never indexed and never static. */
export const metadata: Metadata = {
  title: 'Club leaderboard · ROTRA',
  robots: { index: false, follow: false },
}

export default async function Page(props: PageProps<'/clubs/[clubId]/leaderboard'>) {
  await connection()
  const { clubId } = await props.params
  if (dataMode() !== 'real' && !clubs.some((club) => club.id === clubId)) notFound()
  return <ClubLeaderboard key={clubId} clubId={clubId} />
}
