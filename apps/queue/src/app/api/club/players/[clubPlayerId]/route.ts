import { deleteClubPlayer } from '@rotra/db/queue/club-player-delete'
import { readClubPlayerDetails, updateClubPlayerDetails } from '@rotra/db/queue/club-player-details'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { phoneField } from '@rotra/schema/phone'
import { cookies } from 'next/headers'

const SOCIAL = ['facebook', 'instagram', 'youtube', 'linkedin'] as const
type Ctx = RouteContext<'/api/club/players/[clubPlayerId]'>

/** Q-SAVED-PLAYERS › Edit details: what the club entered for its own guest or unclaimed player. */
export async function GET(_request: Request, ctx: Ctx) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { details: await readClubPlayerDetails(club, clubPlayerId) },
  }))
}

/** Saves Edit details. A phone is only taken when none is on file. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const typedPhone = text(body.phone).trim()
    const phone = typedPhone ? phoneField.safeParse(typedPhone) : null
    if (phone && !phone.success)
      throw new ServiceError('invalid', {
        phone: 'Enter a Philippine mobile number, like 0917 555 0142.',
      })
    const links = (body.socialLinks ?? {}) as Record<string, unknown>
    return {
      body: await updateClubPlayerDetails(club, {
        clubPlayerId,
        fullName: text(body.fullName),
        nickname: text(body.nickname) || null,
        phoneE164: phone?.data ?? null,
        email: text(body.email) || null,
        playingStyle: text(body.playingStyle),
        experienceYears: intOrNull(body.experienceYears),
        experienceMonths: intOrNull(body.experienceMonths),
        socialLinks: Object.fromEntries(SOCIAL.map((p) => [p, text(links[p])])),
      }),
    }
  })
}

/** Delete player: soft delete; history stays (D-DELETE-PLAYER confirms first in the Active Session). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await deleteClubPlayer(club, clubPlayerId),
  }))
}
