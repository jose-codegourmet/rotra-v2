import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { publicSlugFor } from '@rotra/data/queue-session/queueSession.rules'
import { dataMode } from '@rotra/db/auth/data-mode'
import { readPreviewAudience } from '@rotra/db/queue/public-session'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { PublicPagePreview } from './_components/public-page-preview/PublicPagePreview'

/**
 * The operator preview is for the owning club only (#469). proxy.ts lets this path through signed
 * out so a copied preview address still reaches the right page: anyone who is not the owning club
 * is redirected to the visitor page /s/<slug>, which applies its own visibility rules.
 */
export default async function PublicPagePreviewPage(
  props: PageProps<'/sessions/[sessionId]/public-page'>,
) {
  const { sessionId } = await props.params
  const store = await cookies()
  if (dataMode() === 'real') {
    // Server components cannot set cookies; proxy.ts already refreshed the session.
    const audience = await readPreviewAudience(
      { getAll: () => store.getAll(), setAll: () => {} },
      sessionId,
    )
    if (!audience) notFound()
    if (!audience.operator) redirect(`/s/${audience.slug}`)
  } else if (!parseMockSession(store.get(mockCookieName('club'))?.value, 'club')) {
    // The mock store lives in the browser; mock sessions' slugs derive from their id.
    redirect(`/s/${publicSlugFor(sessionId)}`)
  }
  return <PublicPagePreview sessionId={sessionId} />
}
