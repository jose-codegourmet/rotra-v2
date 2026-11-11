import type { PlayerShareParticipant } from '../player/player.types'
import { realRequest } from './client'

// ---------- My sessions (P-OWN-PROFILE) and share-card results ----------

export type WireMySession = {
  id: string
  title: string
  slug: string
  start: string
  end: string
  clubName: string
  status: 'live' | 'confirmed' | 'waitlist' | 'requested'
  waitlistPosition: number | null
}
export type WireMyFinishedSession = {
  id: string
  title: string
  clubName: string
  finishedAt: string
  published: boolean
}
export type WireShareSession = {
  published: boolean
  position: number | null
  games: Record<string, { partners: PlayerShareParticipant[]; opponents: PlayerShareParticipant[] }>
}

export function realGetMySessions(signal?: AbortSignal) {
  return realRequest<{ sessions: WireMySession[]; finished: WireMyFinishedSession[] }>(
    '/api/me/sessions',
    { signal },
  )
}
export function realGetMyShareSession(sessionId: string, signal?: AbortSignal) {
  return realRequest<WireShareSession>(`/api/me/sessions/${encodeURIComponent(sessionId)}/share`, {
    signal,
  })
}
