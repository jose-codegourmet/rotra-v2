import type { QueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import { adminPlayerKeys } from '../admin-player/queryKeys'
import { clubKeys } from '../club/queryKeys'
import { clubPageKeys } from '../club-page/queryKeys'
import { clubPlayerKeys } from '../club-player/queryKeys'
import { clubVenueKeys } from '../club-venue/queryKeys'
import { contactChangeRequestKeys } from '../contact-change-request/queryKeys'
import { featureFlagKeys } from '../feature-flag/queryKeys'
import { inventoryKeys } from '../inventory/queryKeys'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { licenseKeys } from '../license/queryKeys'
import { matchKeys } from '../match/queryKeys'
import { matchRequestKeys } from '../match-request/queryKeys'
import { passwordResetKeys } from '../password-reset/usePasswordResetRequests'
import { playerKeys } from '../player/queryKeys'
import { playerAccountKeys } from '../player-account/queryKeys'
import { playerClubKeys } from '../player-club/queryKeys'
import { publicSessionKeys } from '../public-session/queryKeys'
import { queueSessionKeys } from '../queue-session/queryKeys'
import { salesKeys } from '../sales/queryKeys'
import { sessionCostKeys } from '../session-cost/queryKeys'
import { sessionHostKeys } from '../session-host/queryKeys'
import { sessionPaymentKeys } from '../session-payment/queryKeys'
import { sessionResultKeys } from '../session-result/queryKeys'
import { sessionRosterKeys } from '../session-roster/queryKeys'

type Root = readonly [string]

/** The Player app's read of a session page; the Queue page reads it across origins. */
const PLAYER_SESSION_ACCESS: Root = ['player-session-access']

const PAGE: Root[] = [publicSessionKeys.all, PLAYER_SESSION_ACCESS]

/** What a `changed` of each `kind` re-reads on a session topic (the query roots, never one entry). */
const SESSION_KINDS: Record<string, Root[]> = {
  session: [queueSessionKeys.all, sessionHostKeys.all, ...PAGE],
  roster: [sessionRosterKeys.all, queueSessionKeys.all, ...PAGE],
  courts: [queueSessionKeys.all, matchKeys.all, ...PAGE],
  queue: [matchKeys.all, queueSessionKeys.all, ...PAGE],
  requests: [matchRequestKeys.all, sessionRosterKeys.all, ...PAGE],
  payments: [sessionPaymentKeys.all, sessionCostKeys.all, sessionRosterKeys.all, ...PAGE],
  results: [
    sessionResultKeys.all,
    matchKeys.all,
    queueSessionKeys.all,
    playerKeys.all,
    leaderboardKeys.all,
    ...PAGE,
  ],
  finalization: [
    queueSessionKeys.all,
    sessionResultKeys.all,
    matchKeys.all,
    playerKeys.all,
    leaderboardKeys.all,
    clubPlayerKeys.all,
    ...PAGE,
  ],
}

/** The whole group of one topic type, for `changed` (several things moved) and the first `ready`. */
const TOPIC_GROUPS: Record<string, Root[]> = {
  session: [...new Set(Object.values(SESSION_KINDS).flat())],
  club: [
    clubKeys.all,
    clubPageKeys.all,
    clubVenueKeys.all,
    clubPlayerKeys.all,
    licenseKeys.all,
    inventoryKeys.all,
    queueSessionKeys.all,
    salesKeys.all,
  ],
  player: [
    playerKeys.all,
    playerClubKeys.all,
    playerAccountKeys.all,
    contactChangeRequestKeys.all,
    leaderboardKeys.all,
    ...PAGE,
  ],
  admin: [
    adminPlayerKeys.all,
    adminAuditKeys.all,
    clubKeys.all,
    salesKeys.all,
    licenseKeys.all,
    contactChangeRequestKeys.all,
    featureFlagKeys.all,
    passwordResetKeys.all,
  ],
  'public-session': PAGE,
}

/** Kinds on club topics: a narrower set than the whole club group. */
const CLUB_KINDS: Record<string, Root[]> = {
  club: [clubKeys.all, clubPageKeys.all, clubVenueKeys.all, licenseKeys.all, queueSessionKeys.all],
  players: [clubPlayerKeys.all, playerKeys.all, playerClubKeys.all, leaderboardKeys.all],
  inventory: [inventoryKeys.all],
}

function topicType(topic: string) {
  return topic.includes(':') ? topic.slice(0, topic.indexOf(':')) : topic
}

/** The query roots a change of `kind` on `topic` makes stale; an unknown kind refetches the topic's whole group. */
export function rootsForChange(topic: string, kind: string): Root[] {
  const type = topicType(topic)
  if (type === 'session' && SESSION_KINDS[kind]) return SESSION_KINDS[kind]
  if (type === 'club' && CLUB_KINDS[kind]) return CLUB_KINDS[kind]
  if (type === 'player' && kind === 'players') return TOPIC_GROUPS.player ?? []
  return TOPIC_GROUPS[type] ?? []
}

/** Marks the matching queries stale; mounted ones refetch now. Nothing here changes a query key. */
export function invalidateForChange(client: QueryClient, topic: string, kind: string) {
  for (const root of rootsForChange(topic, kind)) {
    void client.invalidateQueries({ queryKey: root })
  }
}

/** The whole group of every topic, for the one re-read on `ready` when no last id was sent. */
export function invalidateTopics(client: QueryClient, topics: readonly string[]) {
  for (const topic of topics) {
    for (const root of TOPIC_GROUPS[topicType(topic)] ?? []) {
      void client.invalidateQueries({ queryKey: root })
    }
  }
}
