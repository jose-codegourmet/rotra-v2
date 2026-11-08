import { guestRegistrationClub, registerGuest } from '@rotra/db/player/guest-registration'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { registrationRequestSchema } from '@rotra/schema/registration'
import { cookies } from 'next/headers'

export async function GET(_request: Request, ctx: RouteContext<'/api/register/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('player.guest-registration', async () => ({
    body: await guestRegistrationClub(clubId),
  }))
}

export async function POST(request: Request, ctx: RouteContext<'/api/register/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('player.guest-registration', async () => {
    const parsed = registrationRequestSchema.safeParse(await readJsonBody(request))
    if (!parsed.success)
      throw new ServiceError(
        'invalid',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path.at(-1)), issue.message]),
        ),
      )
    const { attempt, values } = parsed.data
    const result = await registerGuest(routeCookieAdapter(await cookies()), clubId, {
      attempt,
      email: values.email,
      phoneE164: values.phone,
      password: values.password,
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
    })
    return { body: result }
  })
}
