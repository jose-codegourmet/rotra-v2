import { appOrigin, configuredOrigin } from '@rotra/data/app-origins'
import { playerOrigin } from '@rotra/data/public-session/context'
import { headers } from 'next/headers'
import { permanentRedirect } from 'next/navigation'

/**
 * The public session page moved to the Player app (D-2026-11-28-01). Links and QR codes clubs
 * already shared point here, so this path stays: a permanent redirect to the same `/s/<slug>` on
 * the paired Player origin, with the query (`?join`, `?tab`, `?invite`, `?transfer`) kept.
 */
export default async function PublicSessionRedirect(props: PageProps<'/s/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
  const target = new URL(`/s/${encodeURIComponent(slug)}`, await pairedPlayerOrigin())
  for (const [key, value] of Object.entries(query)) {
    for (const one of Array.isArray(value) ? value : [value]) {
      if (typeof one === 'string') target.searchParams.append(key, one)
    }
  }
  permanentRedirect(target.href)
}

/** The configured Player origin, else the one paired with this request's Queue origin, else production. */
async function pairedPlayerOrigin() {
  const configured = configuredOrigin('player')
  if (configured) return configured
  const list = await headers()
  const host = list.get('x-forwarded-host') ?? list.get('host')
  const proto = list.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  return (host && playerOrigin(`${proto}://${host}`)) || appOrigin('player')
}
