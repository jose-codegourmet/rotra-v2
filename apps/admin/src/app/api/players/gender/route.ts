import { setAdminPlayersGender } from '@rotra/db/admin/players'
import { requireAdmin } from '@rotra/db/service/authorize'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Admin Players › Set gender: one result per selected player (D-2026-11-19-01, November 25, 2026). */
export async function PATCH(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    requireAdmin(admin)
    const body = await readJsonBody(request)
    const { ids, gender } = body
    if (
      !Array.isArray(ids) ||
      ids.length > 1000 ||
      !ids.every((id) => typeof id === 'string') ||
      (gender !== null && gender !== 'male' && gender !== 'female')
    )
      throw new ServiceError('invalid')
    return { body: { results: await setAdminPlayersGender(admin, { ids, gender }) } }
  })
}
