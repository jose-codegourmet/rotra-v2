import 'server-only'
import { prisma } from '../client/prisma'
import { Prisma } from '../generated/prisma/client'
import { lockClub } from './clubs'

type Tx = Prisma.TransactionClient

/**
 * Expiry-cycle retention (F07.32). Scope is deliberately narrow: only public session pages
 * (`session_publications` → `deleted`, public copy cleared) and their public cache entries. Clubs,
 * sessions, players, match facts, finalizations, snapshots, exports and earned history are never
 * touched. No private-data purge is implied (#248).
 *
 * Safety: deletion names the exact cycle. Under the club lock the sweep rechecks that the cycle is
 * still `running`, past its deadline, and that the club still has no effective access; the SQL guard
 * on `session_publications` checks the same again. A renewal cancels the cycle first, so a sweep
 * queued before renewal exits without removing anything.
 */

/** Public cache invalidation, injected by the worker (CDN/Next revalidation is chosen later). */
export type PublicCachePort = { purge(paths: string[]): Promise<void> }

export const MAX_SWEEP_ATTEMPTS = 5

/** Diagnostics are redacted: IDs, counts and codes only, never names, contacts or page content. */
export type RetentionDiagnostic = {
  cycleId: string
  clubId: string
  outcome: 'deleted' | 'skipped_renewed' | 'skipped_not_due' | 'skipped_access' | 'failed'
  pagesDeleted: number
  cachePurged: boolean
  errorCode?: string
}

/** Puts a club's live public pages under its running cycle, so deletion can name it exactly. */
export async function retainPublicationsUnderCycle(tx: Tx, clubId: string, cycleId: string) {
  const { count } = await tx.sessionPublication.updateMany({
    where: { clubId, state: { not: 'deleted' } },
    data: { expiryCycleId: cycleId, revision: { increment: 1 } },
  })
  return count
}

/** Pages to purge from the public cache for a cycle: deleted pages retained under it. */
async function deletedPaths(cycleId: string) {
  const rows = await prisma.sessionPublication.findMany({
    where: { expiryCycleId: cycleId, state: 'deleted' },
    select: { session: { select: { publicSlug: true } } },
  })
  return rows.map((r) => `/s/${r.session.publicSlug}`)
}

/** One cycle, one transaction: recheck, then delete only this cycle's due public pages. */
async function sweepCycle(cycleId: string, now: Date): Promise<Omit<RetentionDiagnostic, 'cachePurged'>> {
  return prisma.$transaction(async (tx) => {
    const cycle = await tx.clubExpiryCycle.findUniqueOrThrow({ where: { id: cycleId } })
    await lockClub(tx, cycle.clubId)
    const current = await tx.clubExpiryCycle.findUniqueOrThrow({ where: { id: cycleId } })
    const base = { cycleId, clubId: cycle.clubId, pagesDeleted: 0 }
    if (current.state !== 'running') return { ...base, outcome: 'skipped_renewed' as const }
    if (current.deletePublicPagesAfter > now) return { ...base, outcome: 'skipped_not_due' as const }
    const entitlement = await tx.clubEntitlement.findUnique({ where: { clubId: cycle.clubId } })
    if (entitlement?.effectiveAccessEndsAt && entitlement.effectiveAccessEndsAt > now)
      return { ...base, outcome: 'skipped_access' as const }
    const { count } = await tx.sessionPublication.updateMany({
      where: { clubId: cycle.clubId, expiryCycleId: cycleId, state: { not: 'deleted' } },
      data: { state: 'deleted', deletedAt: now, publicResults: Prisma.DbNull, publishedSlides: [], includeOffDay: false, revision: { increment: 1 } },
    })
    await tx.clubExpiryCycle.update({
      where: { id: cycleId },
      data: { state: 'completed', revision: { increment: 1 } },
    })
    return { ...base, outcome: 'deleted' as const, pagesDeleted: count }
  })
}

const errorCode = (error: unknown) =>
  (error as { code?: string })?.code ?? (error instanceof Error ? error.name : 'unknown').slice(0, 40)

/**
 * The scheduled sweep (worker runtime pending #243). Each due cycle is swept in its own
 * transaction; the cache purge runs after commit with bounded retries. A failed purge leaves the
 * cycle `completed` and is retried by `retryCachePurge` (purging is idempotent).
 */
export async function runRetentionSweep(cache: PublicCachePort, now = new Date(), limit = 20) {
  const due = await prisma.clubExpiryCycle.findMany({
    where: { state: 'running', deletePublicPagesAfter: { lte: now } },
    orderBy: [{ deletePublicPagesAfter: 'asc' }, { id: 'asc' }],
    take: limit,
    select: { id: true, clubId: true },
  })
  const diagnostics: RetentionDiagnostic[] = []
  for (const cycle of due) {
    let result: Omit<RetentionDiagnostic, 'cachePurged'>
    try {
      result = await sweepCycle(cycle.id, now)
    } catch (error) {
      diagnostics.push({ cycleId: cycle.id, clubId: cycle.clubId, outcome: 'failed', pagesDeleted: 0, cachePurged: false, errorCode: errorCode(error) })
      continue
    }
    const purge = result.outcome === 'deleted' ? await retryCachePurge(cache, cycle.id) : { purged: false }
    diagnostics.push({ ...result, cachePurged: purge.purged, ...('errorCode' in purge ? { errorCode: purge.errorCode } : {}) })
  }
  return diagnostics
}

/** Purges a completed cycle's deleted pages from the public cache, with bounded retries. */
export async function retryCachePurge(cache: PublicCachePort, cycleId: string) {
  const paths = await deletedPaths(cycleId)
  if (!paths.length) return { purged: true }
  let last: unknown
  for (let attempt = 0; attempt < MAX_SWEEP_ATTEMPTS; attempt++) {
    try {
      await cache.purge(paths)
      return { purged: true }
    } catch (error) {
      last = error
      await new Promise((resolve) => setTimeout(resolve, Math.min(8_000, 500 * 2 ** attempt)))
    }
  }
  return { purged: false, errorCode: errorCode(last) }
}

/** Owner view of upcoming deletions, newest deadline first. IDs and dates only. */
export async function readRetentionSchedule(now = new Date()) {
  const cycles = await prisma.clubExpiryCycle.findMany({
    where: { state: 'running' },
    orderBy: { deletePublicPagesAfter: 'asc' },
    select: {
      id: true,
      clubId: true,
      expiredAt: true,
      deletePublicPagesAfter: true,
      _count: { select: { publications: { where: { state: { not: 'deleted' } } } } },
    },
  })
  return cycles.map((c) => ({
    cycleId: c.id,
    clubId: c.clubId,
    expiredAt: c.expiredAt.toISOString(),
    deletePublicPagesAfter: c.deletePublicPagesAfter.toISOString(),
    due: c.deletePublicPagesAfter <= now,
    pagesRetained: c._count.publications,
  }))
}
