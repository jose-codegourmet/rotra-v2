const EVENT = 'rotra-admin-session-changed'
export function notifyAdminSession() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}
export function subscribeAdminSession(listener: () => void) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('focus', listener)
  window.addEventListener('pageshow', listener)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('focus', listener)
    window.removeEventListener('pageshow', listener)
  }
}
