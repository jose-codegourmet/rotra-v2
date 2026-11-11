import { clubs } from '@rotra/data/fixtures/clubs'
import { dataMode } from '@rotra/db/auth/data-mode'
import { clubPageName } from '@rotra/db/player/club-page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ClubPage } from './_components/club-page/ClubPage'

/** The club's name, or null when unknown. Mock mode answers from the club fixtures. */
async function clubNameOf(clubId: string) {
  try {
    if (dataMode() === 'real') return await clubPageName(clubId)
    return clubs.find((club) => club.id === clubId)?.name ?? null
  } catch {
    return null
  }
}

/** P-CLUB-PAGE (#737): public, served per request, never indexed and never static. */
export async function generateMetadata(props: PageProps<'/clubs/[clubId]'>): Promise<Metadata> {
  const { clubId } = await props.params
  const name = await clubNameOf(clubId)
  return {
    title: name ? `${name} · ROTRA` : 'Club · ROTRA',
    robots: { index: false, follow: false },
  }
}

export default async function Page(props: PageProps<'/clubs/[clubId]'>) {
  await connection()
  const { clubId } = await props.params
  if (dataMode() !== 'real' && !clubs.some((club) => club.id === clubId)) notFound()
  return <ClubPage key={clubId} clubId={clubId} />
}
