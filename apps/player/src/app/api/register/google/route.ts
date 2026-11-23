import { googleRegistrationSchema } from '@rotra/data/google-sign-in/registration-schema'
import { registerWithGoogle } from '@rotra/db/player/google-sign-in'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { googleJar } from '@/app/api/auth/google/googleJar'
import { invalidRegistration, registrationDetails } from '../registrationBody'

/**
 * Google registration from the Admin link (`/register`, D-2026-11-20-01): no club and no session;
 * the form's `cityCode` gives the RTR ID its place, and the player joins no club. The body holds
 * the form only: the Google account is the one the callback verified and holds. Not found while
 * `player_google_sign_in` is off. Club and session invites use `/api/register/[clubId]/google`.
 */
export async function POST(request: Request) {
  return handleVisitorRequest('player.google-sign-in', async () => {
    const body = await readJsonBody(request)
    const parsed = googleRegistrationSchema.safeParse(body.values)
    if (!parsed.success) throw invalidRegistration(parsed.error.issues)
    const { phone, cityCode, ...personal } = parsed.data
    const result = await registerWithGoogle(await googleJar(request), null, {
      phoneE164: phone,
      cityCode: cityCode || null,
      // The identity card picked when several clubs saved the Google email (D-2026-11-16-04)
      identityRecordId: typeof body.identityRecordId === 'string' ? body.identityRecordId : null,
      details: registrationDetails(personal),
    })
    return { body: result }
  })
}
