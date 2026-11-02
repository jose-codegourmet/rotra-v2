import { type AuditReadTarget, readAuditEvents } from '@rotra/db/admin/audit'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const TARGETS: readonly AuditReadTarget[] = ['club', 'player', 'contact_change_request']

/** A record's "Record of actions" (`?targetType=&targetId=`), newest first. Read-only. */
export async function GET(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const params = new URL(request.url).searchParams
    const targetType = params.get('targetType') as AuditReadTarget | null
    if (!targetType || !TARGETS.includes(targetType)) throw new ServiceError('invalid')
    const targetId = params.get('targetId') ?? ''
    return { body: { events: await readAuditEvents(admin, { targetType, targetId }) } }
  })
}
