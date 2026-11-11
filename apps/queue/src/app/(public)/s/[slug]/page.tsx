import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { dataMode } from '@rotra/db/auth/data-mode'
import { readPublicSession } from '@rotra/db/queue/public-session'
import type { Metadata } from 'next'
import { PublicSession } from './_components/public-session/PublicSession'

/**
 * Share-link preview (#720): the title and description a chat or social app shows for a pasted
 * session link. Only the session title is read; a missing, removed or unreadable session gets the
 * fallback copy and never an error.
 */
export async function generateMetadata(props: PageProps<'/s/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const sessionTitle = await publicSessionTitle(slug)
  const copy = sessionTitle
    ? {
        title: `Join the ${sessionTitle} session`,
        description: 'Open this ROTRA session to see details and join.',
      }
    : {
        title: 'Join this ROTRA session',
        description: 'Open this session to see details and join.',
      }
  return {
    ...copy,
    openGraph: { ...copy, type: 'website', siteName: 'ROTRA' },
    twitter: { card: 'summary', ...copy },
  }
}

async function publicSessionTitle(slug: string) {
  try {
    if (dataMode() === 'real') return (await readPublicSession(slug)).title || null
    // Mock mode: the store lives in the browser; the seeded sessions are the ones a link can point to.
    return queueSessionFixtures.sessions.find((s) => s.publicSlug === slug)?.title || null
  } catch {
    return null
  }
}

export default async function PublicSessionPage(props: PageProps<'/s/[slug]'>) {
  const { slug } = await props.params
  const { join, invite } = await props.searchParams
  // ?join=1: the visitor came back from the ROTRA Player login; open Request to join.
  // ?invite=<code>: a Session invite link; the code goes with Request to join as NAME.
  const inviteCode =
    typeof invite === 'string' && /^[A-Za-z0-9]{8}$/.test(invite) ? invite : undefined
  return (
    <PublicSession slug={slug} viewer="visitor" openJoin={join === '1'} inviteCode={inviteCode} />
  )
}
