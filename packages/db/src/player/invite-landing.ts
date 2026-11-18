import 'server-only'
import { readClubInviteCode } from '@rotra/data/club/invite-code'
import type {
  InviteCardData,
  InviteLanding,
  InviteViewerState,
} from '@rotra/data/google-sign-in/types'
import { prisma } from '../client/prisma'
import { readPlayerSessionStanding } from '../queue/public-session'
import { initials } from './club-page'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * P-INVITE, P-JOIN-CLUB and P-JOIN-SESSION in real mode (#922): what a club or session invite link
 * shows and, for a signed-in viewer, where they stand. Reading it never joins anyone (a signed-in
 * player confirmed for a session at a club they aren't in does not become one of its saved players).
 *
 * The same link rules as registration (`guestRegistrationClub`): a club link needs the club's
 * current invite code; a session link needs that club's session with a live public page, not yet
 * started. Not in real mode yet, so never returned: the inviting player on a session invite (no
 * session invite codes are stored; `inviter` is always null and `own-invite` never happens) and the
 * Admin link (no club). `continueUrl` is filled in by the app, which knows the Queue origin.
 */
export async function readInviteLanding(
  link: { clubId: string; sessionSlug?: string | null; clubInviteCode?: string | null },
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
  let state: InviteViewerState = ready
  if (who) {
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
      inviter: null,
      continueUrl: '',
    },
    viewer: state,
  }
}
