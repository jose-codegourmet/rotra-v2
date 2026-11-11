import { clubs } from '@rotra/data/fixtures/clubs'
import { dataMode } from '@rotra/db/auth/data-mode'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ClubMembers } from './_components/club-members/ClubMembers'

/** P-CLUB-MEMBERS (#737): public, served per request, never indexed and never static. */
export const metadata: Metadata = {
  title: 'Members · ROTRA',
  robots: { index: false, follow: false },
}

export default async function Page(props: PageProps<'/clubs/[clubId]/members'>) {
  await connection()
  const { clubId } = await props.params
  if (dataMode() !== 'real' && !clubs.some((club) => club.id === clubId)) notFound()
  return <ClubMembers key={clubId} clubId={clubId} />
}
