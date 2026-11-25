import { setAdminPlayersArchived } from '@rotra/db/admin/players'
import { requireAdmin } from '@rotra/db/service/authorize'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Admin Players › Archive / Restore: a reason, then one result per selected player. */
export async function PATCH(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    requireAdmin(admin)
    const body = await readJsonBody(request)
    const { ids, action } = body
    if (
      !Array.isArray(ids) ||
      ids.length > 1000 ||
      !ids.every((id) => typeof id === 'string') ||
      (action !== 'archive' && action !== 'restore')
    )
      throw new ServiceError('invalid')
    return {
      body: {
        results: await setAdminPlayersArchived(admin, { ids, action, reason: text(body.reason) }),
      },
    }
  })
}
