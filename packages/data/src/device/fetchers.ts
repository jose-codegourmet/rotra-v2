import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { realGetDeviceDownloads } from '../real/device'
import { isRealDataMode } from '../real/mode'

/** Real mode: the sessions this device holds a read-only copy of, for the signed-in account (#477). */
export async function getDeviceDownloads() {
  if (isRealDataMode()) return realGetDeviceDownloads()
  await delay()
  const state = readMockState()
  return (
    state.sessions
      // Only prepared and live sessions are offered; cancelled, finished and invalid ones never are.
      .filter((s) => s.state === 'prepared' || s.state === 'active')
      .map((s) => ({
        sessionId: s.id,
        title: s.title,
        startsAt: s.scheduledStartAt,
        state: state.downloads[s.id] ?? 'none',
      }))
  )
}
