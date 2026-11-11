import { claimLinks } from '@rotra/data/fixtures/player-accounts'
import { dataMode } from '@rotra/db/auth/data-mode'
import { readClaimLink } from '@rotra/db/player/claim'
import type { Metadata } from 'next'
import { Claim } from './_components/claim/Claim'

/**
 * Share-link preview (#720) for a registration (claim) link, whether the club shared it as a profile
 * invite or the club/Admin registered play for the person: both land on this route. The preview
 * never carries a person's name or the token; an unknown, revoked or unreadable link gets the
 * fallback copy and never an error.
 */
export async function generateMetadata(props: PageProps<'/claim/[token]'>): Promise<Metadata> {
  const { token } = await props.params
  const copy = (await claimLinkExists(token))
    ? {
        title: 'Claim your ROTRA profile',
        description: "You've been invited to claim your ROTRA player profile.",
      }
    : {
        title: 'Claim your ROTRA profile',
        description: "You've been invited to claim a ROTRA player profile.",
      }
  return {
    ...copy,
    openGraph: { ...copy, type: 'website', siteName: 'ROTRA' },
    twitter: { card: 'summary', ...copy },
  }
}

async function claimLinkExists(token: string) {
  try {
    if (dataMode() === 'real') return (await readClaimLink(token)).status === 'valid'
    // Mock mode: the store lives in the browser; only the seeded link is known here.
    return claimLinks[token]?.status === 'valid'
  } catch {
    return false
  }
}

export default async function Page(props: PageProps<'/claim/[token]'>) {
  const [{ token }, { opened, next }] = await Promise.all([props.params, props.searchParams])
  // The dev menu reopens the same link with ?opened=…, which must start from the first step again.
  return (
    <Claim
      key={`${token}:${opened ?? ''}`}
      token={token}
      returnTo={typeof next === 'string' ? next : undefined}
    />
  )
}
