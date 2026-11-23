import 'server-only'
import { readClubInviteCode } from '@rotra/data/club/invite-code'
import { shortPlayerName } from '@rotra/data/google-sign-in/rules'
import type {
  InviteCardData,
  InviteLanding,
  InviteViewerState,
} from '@rotra/data/google-sign-in/types'
import { prisma } from '../client/prisma'
import { readPlayerSessionStanding } from '../queue/public-session'
import { initials } from './club-page'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** A Session invite code as `session_invite_codes` stores it (its CHECK); else it is unknown. */
const SESSION_INVITE_CODE = /^[a-z0-9]{6,16}$/

/**
 * P-INVITE, P-JOIN-CLUB and P-JOIN-SESSION in real mode (#922): what a club or session invite link
 * shows and, for a signed-in viewer, where they stand. Reading it never joins anyone (a signed-in
 * player confirmed for a session at a club they aren't in does not become one of its saved players).
 *
 * The same link rules as registration (`guestRegistrationClub`): a club link needs the club's
 * current invite code; a session link needs that club's session with a live public page, not yet
 * started. A session link's `invite` is the inviting player's Session invite code
 * (`session_invite_codes`, made by `getSessionInviteCode`; D-2026-11-09-08, D-2026-11-20-01): when
 * it is this session's, the card names that player (`inviter`) and the inviter themself sees
 * `own-invite`. An unknown, malformed or other session's code shows no inviter, never an error.
 * The Admin link (no club) needs nothing saved and is answered by the app. `continueUrl` is filled
 * in by the app, which knows the Queue origin.
 */
export async function readInviteLanding(
  link: {
    clubId: string
    sessionSlug?: string | null
    clubInviteCode?: string | null
    sessionInviteCode?: string | null
  },
  viewerId: string | null,
): Promise<InviteLanding> {
  const viewer = viewerId
    ? await prisma.player.findUnique({
        where: { id: viewerId },
        select: { id: true, fullName: true },
      })
    : null
  const who = viewer ? { playerId: viewer.id, name: viewer.fullName } : null
  const ready: InviteViewerState = who ? { status: 'ready', ...who } : { status: 'visitor' }
  const unavailable = (
    reason: Extract<InviteCardData, { kind: 'unavailable' }>['reason'],
  ): InviteLanding => ({ card: { kind: 'unavailable', reason }, viewer: ready })

  const club = UUID.test(link.clubId)
    ? await prisma.club.findUnique({
        where: { id: link.clubId },
        select: {
          id: true,
          name: true,
          logoRef: true,
          inviteCode: true,
          foundingLocation: { select: { displayName: true } },
        },
      })
    : null
  if (!club) return unavailable('club')
  const cardClub = {
    id: club.id,
    name: club.name,
    initials: initials(club.name),
    logoUrl: club.logoRef,
    city: club.foundingLocation.displayName,
  }

  if (!link.sessionSlug) {
    const code = readClubInviteCode(link.clubInviteCode)
    if (!code || code !== club.inviteCode) return unavailable('code')
    const [memberCount, member] = await Promise.all([
      prisma.clubPlayer.count({
        where: { clubId: club.id, removedAt: null, player: { profileState: 'claimed' } },
      }),
      who
        ? prisma.clubPlayer.findFirst({
            where: { clubId: club.id, playerId: who.playerId, removedAt: null },
            select: { id: true },
          })
        : null,
    ])
    return {
      card: { kind: 'club', club: cardClub, memberCount },
      viewer: who && member ? { status: 'already-member', ...who } : ready,
    }
  }

  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: link.sessionSlug },
    select: {
      id: true,
      clubId: true,
      title: true,
      state: true,
      publicSlug: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      venueName: true,
      publication: { select: { state: true } },
    },
  })
  if (!session || session.clubId !== club.id || session.publication?.state === 'deleted')
    return unavailable('session')
  // Session invites only work before the session starts (D-2026-11-09-11).
  if (session.state !== 'prepared') return unavailable('started')
  const inviter = await readSessionInviter(session.id, link.sessionInviteCode)
  let state: InviteViewerState = ready
  if (who && inviter?.playerId === who.playerId) state = { status: 'own-invite', ...who }
  else if (who) {
    const standing = await readPlayerSessionStanding(who.playerId, session.id)
    if (standing.waitlistPosition !== null)
      state = { status: 'on-waitlist', ...who, position: standing.waitlistPosition }
    else if (standing.inSession) state = { status: 'already-in', ...who }
    else if (standing.requestPending) state = { status: 'request-pending', ...who }
  }
  return {
    card: {
      kind: 'session',
      club: cardClub,
      session: {
        slug: session.publicSlug,
        title: session.title,
        startsAt: session.scheduledStartAt.getTime(),
        endsAt: session.scheduledEndAt.getTime(),
        venueName: session.venueName ?? '',
      },
      inviter,
      continueUrl: '',
    },
    viewer: state,
  }
}

/**
 * The player who made this Session invite code for this session, or null. The code is the only
 * thing the link carries; the card shows the inviter's name as the mock does (full name, and the
 * nickname or first name for "Invited by"). A lookup failure degrades to no inviter.
 */
async function readSessionInviter(sessionId: string, typed: string | null | undefined) {
  const code = (typed ?? '').trim().toLowerCase()
  if (!SESSION_INVITE_CODE.test(code)) return null
  const saved = await prisma.sessionInviteCode
    .findUnique({
      where: { code },
      select: {
        sessionId: true,
        player: { select: { id: true, fullName: true, nickname: true } },
      },
    })
    .catch((error: unknown) => {
      console.error(
        '[invite-landing] session invite code',
        error instanceof Error ? error.name : typeof error,
      )
      return null
    })
  if (!saved || saved.sessionId !== sessionId) return null
  const { player } = saved
  return {
    playerId: player.id,
    name: player.fullName,
    shortName: shortPlayerName(player.fullName, player.nickname),
  }
}
