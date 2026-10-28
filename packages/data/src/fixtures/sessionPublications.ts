import type {
  SessionPublication,
  SessionPublicationEvent,
} from '../session-result/sessionResult.types'
import { DEMO_CLUB_ID } from './clubs'
import { createSessionHistoryFixtures, sessionHistorySpecs } from './sessionHistory'

/**
 * Publications for the history sessions marked `published` (h1 Thursday Open Play): Standings and
 * Awards shared at session end, Off Day kept private. h2 stays private; h3 is invalid and has none.
 */
export function createSessionPublicationFixtures(now = Date.now()) {
  const { sessions } = createSessionHistoryFixtures(now)
  const publications: SessionPublication[] = sessionHistorySpecs.flatMap((spec) => {
    const session = sessions.find((s) => s.id === spec.id)
    if (!spec.published || !session || session.state !== 'completed') return []
    return [
      {
        sessionId: spec.id,
        publishedSlides: ['standings', 'awards'],
        includeOffDay: false,
        publishedAt: session.scheduledEndAt,
      },
    ]
  })
  const events: SessionPublicationEvent[] = publications.map((p) => ({
    id: `${p.sessionId}-publication-1`,
    sessionId: p.sessionId,
    clubId: DEMO_CLUB_ID,
    publishedSlides: p.publishedSlides,
    includeOffDay: p.includeOffDay,
    at: p.publishedAt,
  }))
  return {
    publications: Object.fromEntries(publications.map((p) => [p.sessionId, p] as const)),
    events,
  }
}

export const sessionPublicationFixtures = createSessionPublicationFixtures()
