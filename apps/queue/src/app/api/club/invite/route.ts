import { readClubInvite, regenerateClubInvite } from '@rotra/db/admin/club-invite'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-CLUB › Club invite link: the club's current invite code, for the verified club account only. */
export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readClubInvite(club),
  }))
}

/** Regenerate link: replaces the code, so the old link and its QR images stop working (#712). */
export async function POST() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await regenerateClubInvite(club),
  }))
}
