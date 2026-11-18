import { claimWithGoogle } from '@rotra/db/player/google-sign-in'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { phoneField } from '@rotra/schema/phone'
import { googleJar } from '@/app/api/auth/google/googleJar'

const SOCIAL = ['facebook', 'instagram', 'youtube', 'linkedin'] as const

/**
 * P-CLAIM submit with Google instead of a password (#922): the profile is claimed with the Google
 * account the callback verified and holds, the Google email becomes the confirmed ROTRA email, and
 * the player is signed in. `{ outcome: 'taken' }` when that Google account is already on another
 * ROTRA account.
 */
export async function POST(request: Request, ctx: RouteContext<'/api/claim/[token]/google'>) {
  const { token } = await ctx.params
  return handleVisitorRequest('player.google-sign-in', async () => {
    const body = await readJsonBody(request)
    const links = (body.socialLinks ?? {}) as Record<string, unknown>
    // Only used when the profile has no phone on file; one on file is never replaced here.
    const typedPhone = text(body.phone).trim()
    const phone = typedPhone ? phoneField.safeParse(typedPhone) : null
    if (phone && !phone.success)
      throw new ServiceError('invalid', {
        phone: 'Enter a Philippine mobile number, like 0917 555 0142.',
      })
    const result = await claimWithGoogle(await googleJar(request), token, {
      phoneE164: phone?.data,
      details: {
        fullName: text(body.fullName),
        nickname: text(body.nickname) || null,
        playingStyle: text(body.playingStyle),
        experienceYears: intOrNull(body.experienceYears),
        experienceMonths: intOrNull(body.experienceMonths),
        socialLinks: Object.fromEntries(SOCIAL.map((p) => [p, text(links[p])])),
      },
    })
    return { body: result }
  })
}
