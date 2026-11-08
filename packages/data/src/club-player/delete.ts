import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import { realDeleteClubPlayer, realGetDeleteImpact } from '../real/queue'
import type { DeleteImpact } from './clubPlayer.types'

const ON_COURT = ['on_court', 'active'] as const

/** What deleting would affect: the Active Session they're in, and whether they're on court. */
export async function getDeleteImpact(id: string): Promise<DeleteImpact> {
  if (isRealDataMode()) return realGetDeleteImpact(id)
  await delay(150)
  const state = readMockState()
  const live = state.sessions.find((s) => s.state === 'active')
  const entry = live && state.roster.find((r) => r.sessionId === live.id && r.clubPlayerId === id)
  if (!live || !entry) return { activeSession: null, busy: false }
  const withThem = state.matches.filter(
    (m) => m.sessionId === live.id && [...m.teamA, ...m.teamB].includes(entry.id),
  )
  return {
    activeSession: {
      title: live.title,
      waitingMatches: withThem.filter((m) => m.state === 'waiting').length,
    },
    busy: withThem.some((m) => (ON_COURT as readonly string[]).includes(m.state)),
  }
}

/**
 * Soft-deletes a saved player. Active Session: Present off. Prepared and upcoming sessions: slot
 * and waitlist spot removed. Finished sessions keep them. On court refuses.
 */
export async function deleteClubPlayer(id: string) {
  if (isRealDataMode()) return realDeleteClubPlayer(id)
  await delay(300)
  checkMockSave()
  let name = ''
  mockStore.update((draft) => {
    const row = draft.clubPlayers.find((p) => p.id === id && !p.removedAt)
    if (!row) throw new MockError('permission', 'Player not available.')
    name = row.fullName
    for (const session of draft.sessions) {
      if (session.state === 'active') {
        const entry = draft.roster.find((r) => r.sessionId === session.id && r.clubPlayerId === id)
        if (!entry) continue
        const busy = draft.matches.some(
          (m) =>
            m.sessionId === session.id &&
            (ON_COURT as readonly string[]).includes(m.state) &&
            [...m.teamA, ...m.teamB].includes(entry.id),
        )
        if (busy)
          throw new MockError(
            'conflict',
            `${row.fullName} is on court. Finish or substitute that match first.`,
          )
        entry.present = false
        entry.presentChangedAt = Date.now()
      }
    }
    const upcoming = new Set(draft.sessions.filter((s) => s.state === 'prepared').map((s) => s.id))
    const current = new Set(
      draft.sessions.filter((s) => s.state === 'prepared' || s.state === 'active').map((s) => s.id),
    )
    draft.roster = draft.roster.filter((r) => !(r.clubPlayerId === id && upcoming.has(r.sessionId)))
    draft.waitlist = draft.waitlist.filter(
      (w) => !(w.clubPlayerId === id && current.has(w.sessionId)),
    )
    row.removedAt = Date.now()
  })
  return { clubPlayerId: id, name }
}
