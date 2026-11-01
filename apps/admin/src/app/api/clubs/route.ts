import {
  findLocationCode,
  provisionClubAccount,
  readAdminClubDirectory,
  stageClub,
} from '@rotra/db/admin/clubs'
import { supabaseProviderAdmin } from '@rotra/db/auth/supabase-provider-admin'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-CLUBS directory: clubs, account state, founding city and license terms. */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { clubs: await readAdminClubDirectory(admin) },
  }))
}

/**
 * A-ADD-CLUB › Create club: stage the club in one transaction, then create the club login outside
 * it. A retry with the same command ID resumes the same club and login.
 */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const price = (body.price ?? {}) as Record<string, unknown>
    const password = text(body.password)
    if (password.length < 8)
      throw new ServiceError('invalid', { password: 'Use at least 8 characters.' })
    const location = await findLocationCode(text(body.cityCode))
    if (!location) throw new ServiceError('invalid', { location: 'Choose the founding city.' })
    const club = await stageClub(admin, {
      commandId: text(body.sourceCommandId),
      name: text(body.name),
      foundingLocationCodeId: location.id,
      foundingAddress: text(body.foundingAddress),
      username: text(body.username),
      pricing:
        price.pricing === 'free'
          ? { pricing: 'free' }
          : { pricing: 'paid', monthlyMinor: int(price.monthly), yearlyMinor: int(price.yearly) },
    })
    await provisionClubAccount(admin, supabaseProviderAdmin(), {
      clubId: club.id,
      initialPassword: password,
    })
    return { status: 201, body: { clubId: club.id, name: club.name } }
  })
}
