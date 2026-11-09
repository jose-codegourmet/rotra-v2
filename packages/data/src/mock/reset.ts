import { mockStore } from './store'

/**
 * Development entry point; the container invalidates its QueryClient after reset. Every slice
 * reseeds, including the player-side requests (join requests, drop-out notices, match requests,
 * Session invite codes); no module keeps its own copy.
 */
export function resetDemoData() {
  mockStore.reset()
}
