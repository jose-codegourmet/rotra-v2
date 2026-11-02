import { readPublicSession } from '@rotra/db/queue/public-session'
import { handlePublicRead } from '@rotra/db/service/handler'

/**
 * Q-PUBLIC-* › the allowlisted public page for a slug, from accepted server state. No account; an
 * unknown or removed slug is `not_found` and reveals nothing about any club.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/public-sessions/[slug]'>) {
  const { slug } = await ctx.params
  return handlePublicRead('public-session.page', async () => ({
    body: await readPublicSession(slug),
  }))
}
