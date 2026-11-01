import { updateClubLogo } from '@rotra/db/admin/club-logo'
import { readClubSettings } from '@rotra/db/admin/clubs'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { club: await readClubSettings(club) },
  }))
}

/** Logo-only write: scope comes from the verified club account, never the request body. */
export async function PATCH(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: {
        club: await updateClubLogo(club, {
          logoUrl: body.logoUrl,
          expectedRevision: body.expectedRevision,
        }),
      },
    }
  })
}
