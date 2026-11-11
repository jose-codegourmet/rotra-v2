import 'server-only'
import { clubSessionStatus, projectMember, sessionPageKept } from '@rotra/data/club-page/rules'
import type { ClubPageMember, ClubPageSessionStatus } from '@rotra/data/club-page/types'
import { loadAccountContext } from '../auth/account-context'
import { MOCK_COOKIE_PREFIX } from '../auth/data-mode'
import { type CookieAdapter, verifySubject } from '../auth/supabase'
import { prisma } from '../client/prisma'
import { levelCodeFor } from '../queue/session-store'
import { ServiceError } from '../service/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The club page read's body: masking is applied here, so a visitor never receives a full name. */
export type ClubPageDto = {
  club: {
    id: string
    name: string
    initials: string
    logoUrl: string | null
    city: string
    /** Join this club opens the club's current invite link (club-page.md, #712). */
    inviteCode: string | null
  }
  signedIn: boolean
  members: ClubPageMember[]
  sessions: {
    id: string
    title: string
    startsAt: number
    endsAt: number
    status: ClubPageSessionStatus
    /** Null when the public page is gone (deleted by retention, or a done session past three months) */
    slug: string | null
  }[]
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** The signed-in Player app account, or null for a visitor. Mock markers are never accepted. */
export async function optionalPlayerId(cookies: CookieAdapter) {
  const verified = await verifySubject(
    {
      getAll: () => cookies.getAll().filter((c) => !c.name.startsWith(MOCK_COOKIE_PREFIX)),
      setAll: (values, headers) => cookies.setAll(values, headers),
    },
    'player',
  )
  const context = verified ? await loadAccountContext(verified, 'player') : null
  return context?.playerId ?? null
}

/**
 * P-CLUB-PAGE / P-CLUB-MEMBERS (#737): the club, its registered members and its sessions. No table
 * is added (identity.md › Public club page reads). Members are `club_players` rows that are not
 * removed, linked to a claimed profile (guests and unclaimed profiles never appear). Masking
 * follows D-2026-11-11-11 for the viewer. `hidden_from_directory` and `profile_visibility` are not
 * migrated yet (#715), so nobody is hidden and only the signed-out rule masks for now.
 */
export async function readClubPage(clubId: string, viewerId: string | null): Promise<ClubPageDto> {
  if (!UUID.test(clubId)) throw new ServiceError('not_found')
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      logoRef: true,
      inviteCode: true,
      foundingLocation: { select: { displayName: true } },
    },
  })
  if (!club) throw new ServiceError('not_found')
  const [rows, sessions] = await Promise.all([
    prisma.clubPlayer.findMany({
      where: {
        clubId,
        removedAt: null,
        playerId: { not: null },
        player: { profileState: 'claimed' },
      },
      select: {
        id: true,
        playerId: true,
        displayName: true,
        player: { select: { fullName: true, nickname: true, avatarRef: true } },
        assessments: { orderBy: { assessedAt: 'desc' }, take: 1, select: { skillLevelId: true } },
      },
    }),
    prisma.queueSession.findMany({
      where: { clubId, state: { notIn: ['cancelled', 'invalid'] } },
      orderBy: { scheduledStartAt: 'asc' },
      select: {
        id: true,
        title: true,
        state: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        publicSlug: true,
        publication: { select: { state: true } },
      },
    }),
  ])
  const now = Date.now()
  const members = rows
    .flatMap((row) =>
      row.playerId && row.player
        ? [
            projectMember(
              {
                key: row.id,
                playerId: row.playerId,
                name: row.player.fullName || row.displayName,
                nickname: row.player.nickname,
                picture: row.player.avatarRef,
                level: levelCodeFor(row.assessments[0]?.skillLevelId ?? null),
              },
              {},
              viewerId,
            ),
          ]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    club: {
      id: club.id,
      name: club.name,
      initials: initials(club.name),
      logoUrl: club.logoRef,
      city: club.foundingLocation.displayName,
      inviteCode: club.inviteCode,
    },
    signedIn: !!viewerId,
    members,
    sessions: sessions.flatMap((s) => {
      const status = clubSessionStatus(s.state)
      if (!status) return []
      const endsAt = s.scheduledEndAt.getTime()
      const gone =
        s.publication?.state === 'deleted' || (status === 'done' && !sessionPageKept(endsAt, now))
      return [
        {
          id: s.id,
          title: s.title,
          startsAt: s.scheduledStartAt.getTime(),
          endsAt,
          status,
          slug: gone ? null : s.publicSlug,
        },
      ]
    }),
  }
}

/** The club's name for the page title, or null for an unknown club (the page is then not found). */
export async function clubPageName(clubId: string) {
  if (!UUID.test(clubId)) return null
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } })
  return club?.name ?? null
}
