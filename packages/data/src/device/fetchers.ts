import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
export async function getDeviceDownloads() {
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
