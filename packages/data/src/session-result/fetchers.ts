import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import type {
  PublishResultsInput,
  SessionPublication,
  SessionResultSnapshot,
} from './sessionResult.types'

/** Q-RESULTS: the private snapshot; null until a valid finalization reached its `slides` stage. */
export async function getSessionResults(id: string): Promise<SessionResultSnapshot | null> {
  await delay()
  const state = readMockState()
  sessionIn(state, id)
  return state.resultSnapshots[id] ?? null
}
/** Q-PUBLISH / public page: the current publication, or null while results are private. */
export async function getSessionPublication(id: string): Promise<SessionPublication | null> {
  await delay()
  const state = readMockState()
  sessionIn(state, id)
  return state.publications[id] ?? null
}
const SLIDE_LABELS = { standings: 'Standings', awards: 'Awards' } as const
/**
 * Publish results, online only: replaces the previous selection, takes Off Day only from this call
 * (never the previous row) and appends a publication event. A failed save keeps the previous publication.
 */
export function publishResults(input: PublishResultsInput) {
  const slides = [...new Set(input.publishedSlides)].sort()
  return queueMutation({ area: 'Published results', onlineOnly: true }, (state) => {
    const session = sessionIn(state, input.sessionId)
    if (session.state !== 'completed')
      throw new MockError('permission', 'Only a completed session can publish results.')
    const snapshot = state.resultSnapshots[input.sessionId]
    if (!snapshot) throw new MockError('permission', 'This session has no result slides yet.')
    // Prototype reference: Off Day alone also counts as a selection (confirmPublish is enabled by slides or Off Day).
    if (!slides.length && !input.includeOffDay)
      throw new MockError('permission', 'Choose at least one slide to publish.')
    const now = Date.now(),
      publication: SessionPublication = {
        sessionId: input.sessionId,
        publishedSlides: slides,
        includeOffDay: input.includeOffDay === true,
        publishedAt: now,
      }
    state.publications[input.sessionId] = publication
    state.publicationEvents.push({
      id: `${input.sessionId}-publication-${state.publicationEvents.filter((e) => e.sessionId === input.sessionId).length + 1}`,
      sessionId: input.sessionId,
      clubId: session.clubId,
      publishedSlides: slides,
      includeOffDay: publication.includeOffDay,
      at: now,
    })
    const published = [
      ...slides.map((s) => SLIDE_LABELS[s]),
      ...(publication.includeOffDay ? ['Off Day'] : []),
    ]
    return { data: publication, text: `${session.title}: ${published.join(', ')} published` }
  })
}
