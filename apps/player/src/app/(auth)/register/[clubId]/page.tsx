import { clubs } from '@rotra/data/fixtures/clubs'
import { dataMode } from '@rotra/db/auth/data-mode'
import { clubPageName } from '@rotra/db/player/club-page'
import type { Metadata } from 'next'
import { GuestRegistration } from './_components/guest-registration/GuestRegistration'

/**
 * Share-link preview (#720) for the club invite link `/register/<clubId>?k=<code>`. Only the
 * public club name is read; the invite code is never read or echoed here (the page itself checks
 * it, #712). An unknown club or any failure gets the fallback copy and never an error.
 */
export async function generateMetadata(props: PageProps<'/register/[clubId]'>): Promise<Metadata> {
  const { clubId } = await props.params
  const clubName = await clubNameOf(clubId)
  const copy = clubName
    ? {
        title: `Join ${clubName}`,
        description: `You're invited to join ${clubName} as a player on ROTRA.`,
      }
    : {
        title: 'Join this club on ROTRA',
        description: "You're invited to join a club as a player on ROTRA.",
      }
  return {
    ...copy,
    openGraph: { ...copy, type: 'website', siteName: 'ROTRA' },
    twitter: { card: 'summary', ...copy },
  }
}

async function clubNameOf(clubId: string) {
  try {
    if (dataMode() === 'real') return (await clubPageName(clubId)) || null
    return clubs.find((club) => club.id === clubId)?.name || null
  } catch {
    return null
  }
}

export default async function RegisterPage(props: PageProps<'/register/[clubId]'>) {
  const [{ clubId }, search] = await Promise.all([props.params, props.searchParams])
  return (
    <GuestRegistration
      clubId={clubId}
      sessionSlug={typeof search.session === 'string' ? search.session : undefined}
      inviteCode={typeof search.k === 'string' ? search.k : undefined}
      returnTo={typeof search.next === 'string' ? search.next : undefined}
    />
  )
}
