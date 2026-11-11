import {
  applyRosterBatch,
  type IdentityCheck,
  MAX_ROSTER_BATCH_OPERATIONS,
  type RosterBatchOperation,
} from '@rotra/db/queue/session-roster'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { phoneField } from '@rotra/schema/phone'
import { cookies } from 'next/headers'

const identityCheckOf = (value: unknown): IdentityCheck | undefined =>
  value === 'rtr-id' || value === 'qr' || value === 'phone' ? value : undefined

/** One wire operation, shaped like the single-op routes read theirs; anything else is `invalid`. */
function operationOf(raw: unknown): RosterBatchOperation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ServiceError('invalid')
  const body = raw as Record<string, unknown>
  const operationId = text(body.operationId)
  switch (body.op) {
    case 'add': {
      const level = text(body.level)
      if (body.source === 'saved')
        return {
          op: 'add',
          operationId,
          source: 'saved',
          clubPlayerId: text(body.clubPlayerId),
          level,
          identityCheck: identityCheckOf(body.identityCheck),
        }
      if (body.source === 'directory')
        return {
          op: 'add',
          operationId,
          source: 'directory',
          playerId: text(body.playerId),
          level,
          identityCheck: identityCheckOf(body.identityCheck),
        }
      const rawPhone = text(body.phone).trim()
      const phone = rawPhone ? phoneField.safeParse(rawPhone) : null
      if (phone && !phone.success)
        throw new ServiceError('invalid', { phone: 'Enter a valid phone number.' })
      return {
        op: 'add',
        operationId,
        source: 'new',
        name: text(body.name),
        nickname: text(body.nickname) || undefined,
        phone: phone?.success ? phone.data : undefined,
        level,
      }
    }
    case 'remove':
      return { op: 'remove', operationId, rosterId: text(body.rosterId) }
    case 'acceptRequest':
      return {
        op: 'acceptRequest',
        operationId,
        requestId: text(body.requestId),
        level: text(body.level),
      }
    case 'declineRequest':
      return { op: 'declineRequest', operationId, requestId: text(body.requestId) }
    default:
      throw new ServiceError('invalid', { op: 'Unknown roster change.' })
  }
}

/**
 * Q-ROSTER › the roster burst batch (#718). `operations` is the Queue Master's burst of adds,
 * removes and join-request decisions in click order; all of it is applied in one transaction, or
 * none. The reply lists each operation's outcome and the roster as saved now. The single-op routes
 * stay for other callers.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/batch'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (!Array.isArray(body.operations) || body.operations.length > MAX_ROSTER_BATCH_OPERATIONS)
      throw new ServiceError('invalid', { operations: 'Send between 1 and 100 roster changes.' })
    const operations = body.operations.map(operationOf)
    return { body: await applyRosterBatch(club, sessionId, operations) }
  })
}
