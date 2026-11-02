import { publishResults } from '@rotra/db/queue/results'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

type Slide = Parameters<typeof publishResults>[2]['slides'][number]

/**
 * Q-PUBLISH › Publish / Publish again, keyed on `commandId`. Off Day is included only when this
 * request says so; it is never carried over from an earlier publish.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/results/publication'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const slides = Array.isArray(body.slides)
      ? body.slides.filter((s): s is Slide => typeof s === 'string')
      : []
    return {
      body: await publishResults(club, sessionId, {
        commandId: text(body.commandId),
        slides,
        includeOffDay: body.includeOffDay === true,
      }),
    }
  })
}
