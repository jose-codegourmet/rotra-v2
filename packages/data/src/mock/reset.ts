import { mockStore } from './store'

/** Development entry point; the container invalidates its QueryClient after reset. */
export function resetDemoData() {
  mockStore.reset()
}
