import { googleRegistrationSchema } from '@rotra/data/google-sign-in/registration-schema'
import { registerWithGoogle } from '@rotra/db/player/google-sign-in'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { googleJar } from '@/app/api/auth/google/googleJar'

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
    if (!parsed.success)
      throw new ServiceError(
        'invalid',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path.at(-1)), issue.message]),
        ),
      )
    const values = parsed.data
    const result = await registerWithGoogle(
      await googleJar(request),
      clubId,
      {
        phoneE164: values.phone,
        details: {
          fullName: values.fullName,
          nickname: values.nickname || null,
          playingStyle: values.playingStyle,
          experienceYears: values.experienceYears ? Number(values.experienceYears) : null,
          experienceMonths: values.experienceMonths ? Number(values.experienceMonths) : null,
          socialLinks: {
            facebook: values.facebook,
            instagram: values.instagram,
            youtube: values.youtube,
            linkedin: values.linkedin,
          },
        },
      },
      search.get('session') || null,
      search.get('k') || null,
    )
    return { body: result }
  })
}
