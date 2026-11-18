import 'server-only'
import type { PlayingLevel } from '@rotra/data/player/types'
import { levelLabel } from '@rotra/data/session-roster/sessionRoster.rules'
import { prisma } from '../client/prisma'
import { readOwnDetails } from '../queue/club-player-own-details'
import { levelCodeFor } from '../queue/session-store'
import { maskPhone } from './claim'
import { currentExperienceMonths } from './profile'
import { normalizeEmail, openEntryByEmail } from './shared-entry'

/**
 * The mock contract's `UnclaimedIdentities` (`@rotra/data/player-account/unclaimed-identity`),
 * restated here: that module carries the mock store, which a server package must not load.
 */
export type UnclaimedIdentities = {
  email: string
  rtrId: string
  records: {
    id: string
    clubId: string
    clubName: string
    clubInitials: string
    clubLogoUrl: string | null
    name: string
    nickname: string | null
    picture: string | null
    level: PlayingLevel | null
    levelLabel: string | null
    maskedPhone: string | null
    playingSince: string | null
    playingStyle: string | null
    links: string[]
    saved: string
    games: number
    sessions: number
  }[]
}

const LINK_NAMES = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['linkedin', 'LinkedIn'],
] as const

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const day = (at: Date, month: 'short' | 'long', withDay: boolean) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month,
    year: 'numeric',
    day: withDay ? 'numeric' : undefined,
  }).format(at)

/**
 * The identity cards for a verified email (D-2026-11-16-04): one per club whose current record
 * points to the open shared entry with that email, the first club that saved them first, in the
 * shape mock mode returns (`UnclaimedIdentities`). Null when no club saved it. Call only with an
 * email the person proved is theirs (the Google email the callback verified), never a typed one.
 * Club pictures are not stored in real mode, so `picture` is null (initials).
 */
export async function readUnclaimedIdentities(
  typed: string,
  now = new Date(),
): Promise<UnclaimedIdentities | null> {
  const email = normalizeEmail(typed)
  if (!email) return null
  const entry = await openEntryByEmail(prisma, email)
  if (!entry) return null
  const records = await prisma.clubPlayer.findMany({
    where: { sharedEntryId: entry.id, removedAt: null, playerId: null },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      clubId: true,
      displayName: true,
      nickname: true,
      addedAt: true,
      club: { select: { name: true, logoRef: true } },
      privateInput: { select: { phoneE164: true, presetFields: true } },
      assessments: { orderBy: { assessedAt: 'desc' }, take: 1, select: { skillLevelId: true } },
      summaries: { select: { sessionId: true, fullGames: true } },
    },
  })
  if (!records.length) return null
  return {
    email,
    rtrId: entry.rtrId,
    records: records.map((record) => {
      const own = readOwnDetails(record.privateInput?.presetFields)
      const months = currentExperienceMonths(own.experienceMonths, own.experienceRecordedAt)
      const since = months == null ? null : new Date(now)
      since?.setMonth(since.getMonth() - (months ?? 0))
      const level = levelCodeFor(record.assessments[0]?.skillLevelId ?? null)
      return {
        id: record.id,
        clubId: record.clubId,
        clubName: record.club.name,
        clubInitials: initials(record.club.name),
        clubLogoUrl: record.club.logoRef,
        name: record.displayName,
        nickname: record.nickname,
        picture: null,
        level,
        levelLabel: level ? levelLabel(level) : null,
        maskedPhone: record.privateInput?.phoneE164
          ? maskPhone(record.privateInput.phoneE164)
          : null,
        playingSince: since ? day(since, 'long', false) : null,
        playingStyle: own.playingStyle || null,
        links: LINK_NAMES.filter(([key]) => own.socialLinks[key]).map(([, name]) => name),
        saved: day(record.addedAt, 'short', true),
        games: record.summaries.reduce((sum, s) => sum + s.fullGames, 0),
        sessions: new Set(record.summaries.map((s) => s.sessionId)).size,
      }
    }),
  }
}
