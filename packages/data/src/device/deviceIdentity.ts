/**
 * The Queue device identity sent at sign-in (B-28): a random id kept in this browser's localStorage
 * and a short human label such as "Chrome on Android". Neither is a secret; Go ignores an id that is
 * not a UUID and shows "This device" for a blank label. Without storage the id is new each call.
 */

const DEVICE_ID_KEY = 'rotra-queue-device-id'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function queueDeviceId(): string {
  try {
    const kept = localStorage.getItem(DEVICE_ID_KEY)
    if (kept && UUID.test(kept)) return kept
    const created = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

type UserAgentData = { platform?: string; brands?: { brand: string }[] }

const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]
const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
]

/** "Chrome on Android"; "This device" when nothing is known. At most 100 characters. */
export function queueDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device'
  const agent = navigator.userAgent ?? ''
  const hinted = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData
  const browser = BROWSERS.find(([pattern]) => pattern.test(agent))?.[1]
  const system = hinted?.platform || SYSTEMS.find(([pattern]) => pattern.test(agent))?.[1]
  const label = browser && system ? `${browser} on ${system}` : (browser ?? system ?? 'This device')
  return label.slice(0, 100)
}
