import { getSession } from '../auth/fetchers'
import { requireOnline } from '../mock/bridge'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { queueSessionUrl } from '../player/mySessions'
import { realGetClubPage } from '../real/club-page'
import { isRealDataMode } from '../real/mode'
import {
  byShownName,
  clubJoinHref,
  clubSessionStatus,
  type MemberVisibility,
  projectMember,
  sessionPageKept,
} from './clubPage.rules'
import type { ClubPage, ClubPageSession } from './clubPage.types'

/**
 * P-CLUB-PAGE / P-CLUB-MEMBERS (#737): the club, its registered members (masked for the viewer) and
 * every session that is scheduled, live or done. Null for an unknown club (not found).
 */
export async function getClubPage(clubId: string, signal?: AbortSignal): Promise<ClubPage | null> {
  if (isRealDataMode()) return realGetClubPage(clubId, signal)
  await delay(200, signal)
  requireOnline()
  const state = readMockState()
  const club = state.clubs.find((c) => c.id === clubId)
  if (!club) return null
  const viewerId = (await getSession('player').catch(() => null))?.account.id ?? null
  const now = Date.now()
  const seen = new Set<string>()
  const members = state.clubPlayers
    .filter(
      (p): p is typeof p & { playerId: string } =>
        p.clubId === clubId && !p.removedAt && p.identity === 'registered' && !!p.playerId,
    )
    .flatMap((p) => {
      // One row per player, even if the club saved them twice.
      if (seen.has(p.playerId)) return []
      seen.add(p.playerId)
      const profile = state.playerProfiles.find((x) => x.playerId === p.playerId)
      const account = state.playerAccounts.find((a) => a.playerId === p.playerId)
      // Guests and unclaimed profiles never appear (identity above, and an unclaimed account).
      if (account && !account.claimed) return []
      const visibility: MemberVisibility = {
        alwaysPrivate: profile?.profileVisibility === 'always_private',
        hiddenFromDirectory: !!profile?.hiddenFromDirectory,
      }
      // Hide me from Player Information: never listed, and not counted.
      if (visibility.hiddenFromDirectory) return []
      return [
        projectMember(
          {
            key: p.id,
            playerId: p.playerId,
            name: profile?.fullName ?? p.fullName,
            nickname: profile?.nickname ?? p.nickname,
            picture: profile?.picture ?? null,
            level: p.playingLevel,
          },
          visibility,
          viewerId,
        ),
      ]
    })
    .sort(byShownName)
  const sessions: ClubPageSession[] = state.sessions
    .filter((s) => s.clubId === clubId)
    .flatMap((s) => {
      const status = clubSessionStatus(s.state)
      if (!status) return []
      const kept = status !== 'done' || sessionPageKept(s.scheduledEndAt, now)
      return [
        {
          id: s.id,
          title: s.title,
          startsAt: s.scheduledStartAt,
          endsAt: s.scheduledEndAt,
          status,
          href: kept ? queueSessionUrl(s.publicSlug) : null,
        },
      ]
    })
    .sort((a, b) => a.startsAt - b.startsAt)
  return {
    club: {
      id: club.id,
      name: club.name,
      initials: club.initials,
      logoUrl: club.logoUrl ?? null,
      city: club.city,
      joinHref: clubJoinHref(club.id, club.inviteCode),
    },
    signedIn: !!viewerId,
    members,
    sessions,
  }
}
