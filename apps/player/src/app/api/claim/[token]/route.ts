import { registerFromClaim } from '@rotra/db/player/account-access'
import { readClaimLink } from '@rotra/db/player/claim'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { phoneField } from '@rotra/schema/phone'
import { cookies } from 'next/headers'

const SOCIAL = ['facebook', 'instagram', 'youtube', 'linkedin'] as const

/** P-CLAIM read: public identity, masked phone and preset details. Unknown or revoked is 404. */
export async function GET(_request: Request, ctx: RouteContext<'/api/claim/[token]'>) {
  const { token } = await ctx.params
  return handleVisitorRequest('player.claim-link', async () => ({
    body: { link: await readClaimLink(token) },
  }))
}

/** P-CLAIM submit: email + password login, profile claimed, signed in, details saved. */
export async function POST(request: Request, ctx: RouteContext<'/api/claim/[token]'>) {
  const { token } = await ctx.params
  return handleVisitorRequest('player.claim', async () => {
    const body = await readJsonBody(request)
    const links = (body.socialLinks ?? {}) as Record<string, unknown>
    // Only used when the profile has no phone on file; one on file is never replaced here.
    const typedPhone = text(body.phone).trim()
    const phone = typedPhone ? phoneField.safeParse(typedPhone) : null
    if (phone && !phone.success)
      throw new ServiceError('invalid', {
        phone: 'Enter a Philippine mobile number, like 0917 555 0142.',
      })
    const result = await registerFromClaim(routeCookieAdapter(await cookies()), token, {
      email: text(body.email),
      password: text(body.password),
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
