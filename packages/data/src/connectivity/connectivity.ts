import { getMockDevState, subscribeMockBridge } from '../mock/bridge'

export type Connectivity = 'online' | 'offline'

/**
 * The one connectivity truth for `@rotra/data`: the browser's own signal (`navigator.onLine`) and
 * the DevMenu "Simulate offline" toggle, either of which makes the app offline. On the server
 * (no `window`) it is always 'online'.
 */
export function getConnectivity(): Connectivity {
  // Node has no `navigator.onLine` and the bridge defaults to online, so a server render is online.
  const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false
  return browserOffline || getMockDevState().offline ? 'offline' : 'online'
}

/** Fires on the browser's `online` / `offline` events and on every dev-toggle change. */
export function subscribeConnectivity(listener: () => void) {
  const unsubscribe = subscribeMockBridge(listener)
  if (typeof window === 'undefined') return unsubscribe
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    unsubscribe()
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
