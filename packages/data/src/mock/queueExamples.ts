import { createCourtWindowFixtures } from '../fixtures/consoleSessions'
import { createAdmissionFixtures } from '../fixtures/sessionWaitlist'
import { mockStore } from './store'

/** Development-only owner examples. Explicit reset never touches a backend or durable data. */
export function loadQueueFlexibilityExample(kind: 'admission' | 'courts') {
  mockStore.reset()
  const now = Date.now(),
    admission = createAdmissionFixtures(now)
  const example = kind === 'admission' ? admission : createCourtWindowFixtures(now)
  const sessionId = example.session.id
  mockStore.update((s) => {
    s.sessions = s.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...example.session,
            title:
              kind === 'admission' ? '36 to 37 · admission example' : 'Five-court booking example',
          }
        : session,
    )
    s.roster = [...s.roster.filter((p) => p.sessionId !== sessionId), ...example.roster]
    s.courts = [...s.courts.filter((c) => c.sessionId !== sessionId), ...example.courts]
    s.matches = s.matches.filter((m) => m.sessionId !== sessionId)
    s.waitlist = kind === 'admission' ? admission.waitlist : []
    for (const player of admission.clubPlayers)
      if (!s.clubPlayers.some((p) => p.id === player.id)) s.clubPlayers.push(player)
    s.downloads[sessionId] = 'ready'
  })
  return sessionId
}
