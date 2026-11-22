import {
  removeClubPlayerPicture,
  restorePreviousClubPlayerPicture,
  setClubPlayerPicture,
} from '@rotra/db/queue/club-player-picture'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { readClubPictureRequest } from './picture-request'

type Ctx = RouteContext<'/api/club/players/[clubPlayerId]/picture'>

/**
 * Q-SAVED-PLAYERS › Edit details › Profile picture (D-2026-11-09-12) for the club's own guest or
 * unclaimed player. PATCH multipart: Upload photo (`kind=photo`, `photo`, optional `crop`) or Choose
 * a character (`kind=character`, `id`). DELETE: Remove (initials). POST: Use previous picture.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await setClubPlayerPicture(club, clubPlayerId, await readClubPictureRequest(request)),
  }))
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await removeClubPlayerPicture(club, clubPlayerId),
  }))
}

export async function POST(_request: Request, ctx: Ctx) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await restorePreviousClubPlayerPicture(club, clubPlayerId),
  }))
}
