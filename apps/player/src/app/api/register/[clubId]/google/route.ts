import { googleRegistrationSchema } from '@rotra/data/google-sign-in/registration-schema'
import { registerWithGoogle } from '@rotra/db/player/google-sign-in'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { googleJar } from '@/app/api/auth/google/googleJar'
import { invalidRegistration, registrationDetails } from '../../registrationBody'

/**
 * Google registration from a club or session invite (#922). The body holds the form only: the
 * Google account is the one the callback verified and holds, never one the browser names. The link
 * rules are the password registration's (`?session=<slug>`, `?k=<club invite code>`).
 */
export async function POST(request: Request, ctx: RouteContext<'/api/register/[clubId]/google'>) {
  const { clubId } = await ctx.params
  const search = new URL(request.url).searchParams
  return handleVisitorRequest('player.google-sign-in', async () => {
    const body = await readJsonBody(request)
    const parsed = googleRegistrationSchema.safeParse(body.values)
    if (!parsed.success) throw invalidRegistration(parsed.error.issues)
    const { phone, cityCode: _cityCode, ...personal } = parsed.data
    const result = await registerWithGoogle(
      await googleJar(request),
      clubId,
      {
        phoneE164: phone,
        // The identity card picked when several clubs saved the Google email (D-2026-11-16-04)
        identityRecordId: typeof body.identityRecordId === 'string' ? body.identityRecordId : null,
        details: registrationDetails(personal),
      },
      search.get('session') || null,
      search.get('k') || null,
    )
    return { body: result }
  })
}
