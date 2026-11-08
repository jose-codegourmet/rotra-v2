import { updatePlayerAvatar } from '@rotra/db/player/avatar'
import { readMyAccount, updateMyProfile } from '@rotra/db/player/profile'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { readAvatarRequest } from './avatar-request'

const SOCIAL = ['facebook', 'instagram', 'youtube', 'linkedin'] as const

/**
 * P-EDIT-PROFILE save under the loaded revision. Contacts are never accepted here. P-EDIT-PROFILE
 * does not edit the picture, so the saved one is kept (a stale revision is still a conflict).
 */
export async function PATCH(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      const { choice, expectedRevision } = await readAvatarRequest(request)
      return { body: await updatePlayerAvatar(player, expectedRevision, choice) }
    }
    const body = await readJsonBody(request)
    const links = (body.socialLinks ?? {}) as Record<string, unknown>
    const profile = await updateMyProfile(player, {
      expectedRevision: text(body.expectedRevision),
      fullName: text(body.fullName),
      nickname: text(body.nickname) || null,
      playingStyle: text(body.playingStyle),
      experienceYears: intOrNull(body.experienceYears),
      experienceMonths: intOrNull(body.experienceMonths),
      socialLinks: Object.fromEntries(SOCIAL.map((p) => [p, text(links[p])])),
    })
    return { body: { profile, revision: (await readMyAccount(player)).revision } }
  })
}
