import { readMyAccount, readMyProfile, updateMyProfile } from '@rotra/db/player/profile'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const SOCIAL = ['facebook', 'instagram', 'youtube', 'linkedin'] as const

/**
 * P-EDIT-PROFILE save under the loaded revision. Contacts are never accepted here. P-EDIT-PROFILE
 * does not edit the picture, so the saved one is kept (a stale revision is still a conflict).
 */
export async function PATCH(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const links = (body.socialLinks ?? {}) as Record<string, unknown>
    const current = await readMyProfile(player)
    const profile = await updateMyProfile(player, {
      expectedRevision: text(body.expectedRevision),
      fullName: text(body.fullName),
      nickname: text(body.nickname) || null,
      picture: current.picture,
      playingStyle: text(body.playingStyle),
      experienceYears: intOrNull(body.experienceYears),
      experienceMonths: intOrNull(body.experienceMonths),
      socialLinks: Object.fromEntries(SOCIAL.map((p) => [p, text(links[p])])),
    })
    return { body: { profile, revision: (await readMyAccount(player)).revision } }
  })
}
