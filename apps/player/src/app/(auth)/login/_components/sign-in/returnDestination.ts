/** Accept only same-app absolute paths; never turn a return parameter into an external redirect. */
export function returnDestination(returnTo: string | undefined, fallback: string) {
  if (!returnTo?.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\'))
    return fallback
  try {
    const url = new URL(returnTo, 'https://rotra.local')
    return url.origin === 'https://rotra.local' && url.pathname !== '/login'
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback
  } catch {
    return fallback
  }
}
