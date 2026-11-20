import { guestRegistrationClub, registerGuest } from '@rotra/db/player/guest-registration'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { registrationRequestSchema } from '@rotra/schema/registration'
import { cookies } from 'next/headers'
import { invalidRegistration, registrationDetails } from '../registrationBody'

/** `?session=<slug>`: the session link the visitor registers from (#689); optional. */
const sessionOf = (request: Request) => new URL(request.url).searchParams.get('session') || null
/** `?k=<code>`: the club invite code; a club link without the current one is refused (#712). */
const inviteOf = (request: Request) => new URL(request.url).searchParams.get('k') || null

export async function GET(request: Request, ctx: RouteContext<'/api/register/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('player.guest-registration', async () => ({
    body: await guestRegistrationClub(clubId, sessionOf(request), inviteOf(request)),
  }))
}

export async function POST(request: Request, ctx: RouteContext<'/api/register/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('player.guest-registration', async () => {
    const parsed = registrationRequestSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) throw invalidRegistration(parsed.error.issues)
    const { attempt, values } = parsed.data
    const { email, phone, password, cityCode: _cityCode, ...personal } = values
    const result = await registerGuest(
      routeCookieAdapter(await cookies()),
      clubId,
      { attempt, email, phoneE164: phone, password, details: registrationDetails(personal) },
      sessionOf(request),
      inviteOf(request),
    )
    return { body: result }
  })
}
