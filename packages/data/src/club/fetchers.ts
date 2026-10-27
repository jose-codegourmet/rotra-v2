import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import type { Club } from './club.types'

/** Swap this implementation for the real transport when the database epic lands. */
export async function getClub(id: string, signal?: AbortSignal): Promise<Club> {
  await delay(400, signal)
  requireOnline()
  requireClubAccess()
  const club = mockStore.getSnapshot().clubs.find((entry) => entry.id === id)
  if (!club) throw new MockError('permission', 'This club is not available.')
  return structuredClone(club)
}
