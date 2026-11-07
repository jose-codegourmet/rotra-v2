import { composeFacebookPost } from '../club/club.rules'
import {
  realGetClub,
  realGetClubPlayers,
  realGetQueueSession,
  realGetQueueSessions,
  realGetSessionRoster,
} from './queue'

/**
 * Real mode for the Copy Facebook post dialog: the saved club (template, description, rules), the
 * session with its courts, and the current roster and waitlist, all read fresh from the Route
 * Handlers. A failed read throws, so the dialog shows the error instead of a blank post.
 */
export async function realGetFacebookPost(
  sessionId: string,
  draft?: { template?: string; description?: string; courtRules?: string },
) {
  const [club, session, rosterRead, players] = await Promise.all([
    realGetClub(),
    realGetQueueSession(sessionId),
    realGetSessionRoster(sessionId),
    realGetClubPlayers(),
  ])
  const nameOf = new Map(players.map((p) => [p.id, p.fullName]))
  return composeFacebookPost({
    club,
    draft,
    session,
    courts: session.courts.filter((c) => !c.removedAt),
    roster: [...rosterRead.roster]
      .sort((a, b) => a.confirmedAt - b.confirmedAt)
      .map((r) => ({ name: r.nameSnapshot, nickname: r.nicknameSnapshot })),
    waitlist: [...rosterRead.waitlist]
      .sort((a, b) => a.addedAt - b.addedAt)
      .map((w) => ({ name: nameOf.get(w.clubPlayerId) ?? '' })),
  })
}

/** The Club settings preview: the unsaved draft filled with the live session, else the next prepared one. */
export async function realGetPostPreview(draft: {
  template?: string
  description?: string
  courtRules?: string
}) {
  const sessions = await realGetQueueSessions()
  const session =
    sessions.find((s) => s.state === 'active') ??
    sessions
      .filter((s) => s.state === 'prepared')
      .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt)[0]
  return session ? realGetFacebookPost(session.id, draft) : null
}
