import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import { realGetDeviceDownloads } from '../real/sync'

/** Real mode: not connected until device enrollment (#246) and browser storage (Q11) exist. */
export async function getDeviceDownloads() {
  if (isRealDataMode()) return realGetDeviceDownloads()
  await delay()
  const state = readMockState()
  return state.sessions
    .filter((s) => s.state === 'prepared' || s.state === 'active')
    .map((s) => ({
      sessionId: s.id,
      title: s.title,
      startsAt: s.scheduledStartAt,
      state: state.downloads[s.id] ?? 'none',
    }))
}
