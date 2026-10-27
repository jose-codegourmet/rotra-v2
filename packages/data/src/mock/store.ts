import type { Club } from '../club/club.types'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import type { ClubVenue } from '../club-venue/clubVenue.types'
import { clubs } from '../fixtures/clubs'
import { clubPlayers, players } from '../fixtures/players'
import { venues } from '../fixtures/venues'
import type { Player } from '../player/player.types'

export type MockState = {
  clubs: Club[]
  venues: ClubVenue[]
  players: Player[]
  clubPlayers: ClubPlayer[]
}

type Snapshot = { readonly [Key in keyof MockState]: readonly Readonly<MockState[Key][number]>[] }

function seedState(): MockState {
  return structuredClone({ clubs, venues, players, clubPlayers })
}

function snapshotOf(state: MockState): Snapshot {
  for (const collection of Object.values(state)) {
    for (const entry of collection) Object.freeze(entry)
    Object.freeze(collection)
  }
  return Object.freeze(state)
}

/** A separate store can be created for isolated demos; nothing persists across a page reload. */
export function createMockStore() {
  let snapshot = snapshotOf(seedState())
  const listeners = new Set<() => void>()
  function notify() {
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    /** Only domain fetchers write here; hooks own query-cache invalidation after mutations. */
    update(change: (draft: MockState) => void) {
      const draft = structuredClone(snapshot) as MockState
      change(draft)
      snapshot = snapshotOf(structuredClone(draft))
      notify()
    },
    reset() {
      snapshot = snapshotOf(seedState())
      notify()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** Shared store for this page visit; components use domain hooks instead. */
export const mockStore = createMockStore()
