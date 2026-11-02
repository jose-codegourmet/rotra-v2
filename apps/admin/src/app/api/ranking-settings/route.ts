import { readRankingPolicies, saveRankingPolicy } from '@rotra/db/admin/configuration'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-RANK-CONFIG: every saved ranking settings version, oldest first (the newest is in effect). */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { versions: await readRankingPolicies(admin) },
  }))
}

/**
 * D-CONFIG › Save configuration: appends the next version only when `expectedVersion` is still the
 * newest; otherwise a conflict. Records configuration only; no rank is recalculated (#247).
 */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const version = await saveRankingPolicy(admin, {
      commandId: text(body.commandId),
      expectedVersion: intOrNull(body.expectedVersion),
      assessmentWeightBp: int(body.assessmentWeightBp),
      performanceWeightBp: int(body.performanceWeightBp),
      recentStandardMatchThreshold: int(body.recentStandardMatchThreshold),
      changeNote: text(body.changeNote),
    })
    return { status: 201, body: { version } }
  })
}
