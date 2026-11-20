import { registerGuest } from '@rotra/db/player/guest-registration'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { registrationRequestSchema } from '@rotra/schema/registration'
import { cookies } from 'next/headers'
import { invalidRegistration, registrationDetails } from './registrationBody'

/**
 * Registration from the Admin link (`/register`, D-2026-11-09-06; real mode D-2026-11-20-01): no
 * club and no session. The form's `cityCode` (a founding city, `PH-CEB`) gives the RTR ID its place
 * unless the email keeps the RTR ID clubs already gave it. The player joins no club. Club and
 * session links register through `/api/register/[clubId]`.
 */
export async function POST(request: Request) {
  return handleVisitorRequest('player.guest-registration', async () => {
    const parsed = registrationRequestSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) throw invalidRegistration(parsed.error.issues)
    const { attempt, values } = parsed.data
    const { email, phone, password, cityCode, ...personal } = values
    const result = await registerGuest(routeCookieAdapter(await cookies()), null, {
      attempt,
      email,
      phoneE164: phone,
      password,
      cityCode: cityCode || null,
      details: registrationDetails(personal),
    })
    return { body: result }
  })
}
