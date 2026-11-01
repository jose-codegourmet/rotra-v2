import 'server-only'
import { ROWS_PER_FRAME } from '@rotra/data/session-result/sessionResult.rules'
import type { SessionAwards, StandingRow } from '@rotra/data/session-result/types'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type {
  ExportFormat,
  Prisma,
  ResultSlide,
  SessionResultSnapshot,
} from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toIso, toIsoOrNull } from '../service/serialize'
import { derivedId, lockSession, requireSessionAccess, type Tx } from './session-store'

/**
 * Private results and explicit publication (Q-RESULTS). The private snapshot (with ids, scores and
 * Off Day) is club-only. The public page reads only `session_publications.public_results`, a copy of
 * exactly the selected slides built here from an allowlist: names and counts, no ids, contacts,
 * financials, levels or raw evidence. Off Day is excluded unless THIS publish includes it.
 */

const SLIDES: ResultSlide[] = ['standings', 'awards']

function validSlides(slides: ResultSlide[], includeOffDay: boolean) {
  const unique = [...new Set(slides)]
  if (!unique.length || unique.some((s) => !SLIDES.includes(s)))
    throw new ServiceError('invalid', { slides: 'Choose standings, awards or both.' })
  if (includeOffDay && !unique.includes('awards'))
    throw new ServiceError('invalid', { offDay: 'Off Day goes with the awards slide.' })
  return unique
}

async function latestSnapshot(tx: Tx | typeof prisma, sessionId: string) {
  return tx.sessionResultSnapshot.findFirst({ where: { sessionId }, orderBy: { version: 'desc' } })
}

/** The public copy: names and counts only. */
function publicCopy(
  snapshot: SessionResultSnapshot,
  slides: ResultSlide[],
  includeOffDay: boolean,
) {
  const out: Record<string, Prisma.InputJsonValue> = {}
  if (slides.includes('standings'))
    out.standings = (snapshot.standings as unknown as StandingRow[]).map((r) => ({
      position: r.position,
      name: r.name,
      wins: r.wins,
      losses: r.losses,
      games: r.games,
    }))
  if (slides.includes('awards')) {
    const awards = snapshot.awards as unknown as Omit<SessionAwards, 'offDay'>
    out.awards = {
      mvp: awards.mvp ? { name: awards.mvp.name } : null,
      mostImproved: awards.mostImproved
        ? { name: awards.mostImproved.name, priorSessions: awards.mostImproved.priorSessions }
        : null,
    }
  }
  if (includeOffDay)
    out.offDay = ((snapshot.offDay ?? []) as unknown as SessionAwards['offDay']).map((r) => ({
      name: r.name,
      priorSessions: r.priorSessions,
    }))
  return out
}

/** Allowlisted Details/Participants copies for the publication row. */
async function pageProjections(tx: Tx, sessionId: string) {
  const session = await tx.queueSession.findUniqueOrThrow({ where: { id: sessionId } })
  const roster = await tx.sessionPlayer.findMany({
    where: { sessionId, releasedAt: null },
    orderBy: [{ confirmedAt: 'asc' }, { id: 'asc' }],
    select: {
      nameSnapshot: true,
      playerIdAtEntry: true,
      clubPlayer: { select: { player: { select: { avatarRef: true } } } },
    },
  })
  return {
    detailsProjection: {
      title: session.title,
      start: session.scheduledStartAt.getTime(),
      end: session.scheduledEndAt.getTime(),
      venue: { name: session.venueName ?? '', address: session.venueAddress },
      minimum: session.minimumGames,
    },
    participantsProjection: roster.map((r) => ({
      name: r.nameSnapshot,
      pictureUrl: r.clubPlayer.player?.avatarRef ?? null,
      hasRotraProfile: !!r.playerIdAtEntry,
    })),
  }
}

function publicKey() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64url')
}

/** Q-RESULTS private read: snapshot, current publication and exports. Club-only, no-store. */
export async function readSessionResults(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
    include: { publication: true, finalization: { select: { state: true, stage: true } } },
  })
  if (!session) throw new ServiceError('not_found')
  if (session.state === 'invalid') return null
  await requireSessionAccess(context, session)
  const snapshot = await latestSnapshot(prisma, sessionId)
  const exports = await prisma.resultExport.findMany({
    where: { sessionId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const pub = session.publication
  return {
    finalization: session.finalization,
    snapshot: snapshot && {
      id: snapshot.id,
      version: snapshot.version,
      calculationVersion: snapshot.calculationVersion,
      standings: snapshot.standings,
      awards: snapshot.awards,
      offDay: snapshot.offDay,
      generatedAt: toIso(snapshot.generatedAt),
    },
    publication: pub && {
      state: pub.state,
      publishedSlides: pub.publishedSlides,
      includeOffDay: pub.includeOffDay,
      publishedAt: toIsoOrNull(pub.publishedAt),
    },
    exports: exports.map((e) => ({
      id: e.id,
      format: e.format,
      slides: e.slides,
      includeOffDay: e.includeOffDay,
      frameCount: e.frameCount,
      ready: !!e.assetRef,
      createdAt: toIso(e.createdAt),
    })),
  }
}

/**
 * Q-RESULTS · Publish / Publish again. Each publish replaces the selection and needs a fresh,
 * explicit Off Day choice (absent = excluded), appends a consent event, and never touches facts or
 * the snapshot. Repeat-safe on `commandId` through the event's unique key.
 */
export async function publishResults(
  context: ClubContext,
  sessionId: string,
  input: {
    commandId: string
    slides: ResultSlide[]
    includeOffDay?: boolean
    deviceId?: string | null
  },
) {
  const includeOffDay = input.includeOffDay === true
  const slides = validSlides(input.slides, includeOffDay)
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
    const done = await tx.sessionPublicationEvent.findUnique({
      where: { sourceCommandId: input.commandId },
    })
    if (done) {
      if (done.sessionId !== sessionId) throw new ServiceError('conflict')
      return {
        slides: done.slides,
        includeOffDay: done.includeOffDay,
        publishedAt: toIso(done.occurredAt),
      }
    }
    if (session.state !== 'completed')
      throw new ServiceError('invalid', { state: 'Finish the session before publishing results.' })
    const snapshot = await latestSnapshot(tx, sessionId)
    if (!snapshot)
      throw new ServiceError('unavailable', { results: 'Results are still being prepared.' })
    const now = new Date()
    let publication = await tx.sessionPublication.findUnique({ where: { sessionId } })
    if (publication?.state === 'deleted')
      throw new ServiceError('forbidden', { publication: 'This public page was removed.' })
    const entitlement = await tx.clubEntitlement.findUnique({ where: { clubId: context.clubId } })
    if (!publication)
      publication = await tx.sessionPublication.create({
        data: {
          clubId: context.clubId,
          sessionId,
          publicKey: publicKey(),
          ...(await pageProjections(tx, sessionId)),
          expiryCycleId: entitlement?.currentExpiryCycleId ?? null,
          lastSyncedAt: now,
        },
      })
    const updated = await tx.sessionPublication.update({
      where: { id: publication.id },
      data: {
        state: 'published',
        publishedSnapshotId: snapshot.id,
        publishedSlides: slides,
        includeOffDay,
        publicResults: publicCopy(snapshot, slides, includeOffDay),
        publishedAt: now,
        lastSyncedAt: now,
        revision: { increment: 1 },
      },
    })
    await tx.sessionPublicationEvent.create({
      data: {
        clubId: context.clubId,
        sessionId,
        publicationId: updated.id,
        snapshotId: snapshot.id,
        slides,
        includeOffDay,
        actorClubId: context.clubId,
        deviceId: input.deviceId ?? null,
        sourceCommandId: input.commandId,
        occurredAt: now,
      },
    })
    return { slides, includeOffDay, publishedAt: toIso(now) }
  })
}

/**
 * Public results for a session page (`public-session.page`): only the stored public copy of a
 * `published` row. Never reads the private snapshot.
 */
export async function readPublishedResults(sessionId: string) {
  const pub = await prisma.sessionPublication.findUnique({
    where: { sessionId },
    select: { state: true, publicResults: true },
  })
  if (pub?.state !== 'published' || !pub.publicResults) return null
  return pub.publicResults as Record<string, unknown>
}

/**
 * Q-RESULTS · Download images. Records a private export with a stable identity from the command
 * (the asset path is derived from it, so a re-render overwrites the same object); rendering runs
 * later and a failure leaves the finalization and snapshot intact.
 */
export async function requestResultExport(
  context: ClubContext,
  sessionId: string,
  input: {
    commandId: string
    slides: ResultSlide[]
    format: ExportFormat
    includeOffDay?: boolean
  },
) {
  const includeOffDay = input.includeOffDay === true
  const slides = validSlides(input.slides, includeOffDay)
  if (input.format !== 'story' && input.format !== 'feed')
    throw new ServiceError('invalid', { format: 'Choose story or feed.' })
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
    const done = await tx.resultExport.findUnique({ where: { sourceCommandId: input.commandId } })
    if (done) return { id: done.id, frameCount: done.frameCount, ready: !!done.assetRef }
    if (session.state !== 'completed')
      throw new ServiceError('invalid', { state: 'Finish the session first.' })
    const snapshot = await latestSnapshot(tx, sessionId)
    if (!snapshot)
      throw new ServiceError('unavailable', { results: 'Results are still being prepared.' })
    const club = await tx.club.findUniqueOrThrow({
      where: { id: context.clubId },
      select: { name: true, logoRef: true },
    })
    const rows = (snapshot.standings as unknown as StandingRow[]).length
    const standingFrames = slides.includes('standings')
      ? Math.max(1, Math.ceil(rows / ROWS_PER_FRAME[input.format]))
      : 0
    const created = await tx.resultExport.create({
      data: {
        id: await derivedId(input.commandId, 'export'),
        clubId: context.clubId,
        sessionId,
        snapshotId: snapshot.id,
        slides,
        format: input.format,
        includeOffDay,
        clubNameSnapshot: club.name,
        clubLogoRefSnapshot: club.logoRef,
        frameCount: standingFrames + (slides.includes('awards') ? 1 : 0),
        sourceCommandId: input.commandId,
      },
    })
    return { id: created.id, frameCount: created.frameCount, ready: false }
  })
}

/** Private storage key for an export; stable per export so retries overwrite, never duplicate. */
export function exportAssetKey(clubId: string, sessionId: string, exportId: string) {
  return `private/clubs/${clubId}/sessions/${sessionId}/exports/${exportId}.zip`
}

/** Called by the renderer after a successful upload. Repeat-safe; a second ref must match. */
export async function markExportRendered(exportId: string, assetRef: string) {
  const row = await prisma.resultExport.findUnique({ where: { id: exportId } })
  if (!row) throw new ServiceError('not_found')
  if (row.assetRef) {
    if (row.assetRef !== assetRef) throw new ServiceError('conflict')
    return { id: row.id, ready: true }
  }
  await prisma.resultExport.update({ where: { id: exportId }, data: { assetRef } })
  return { id: exportId, ready: true }
}
