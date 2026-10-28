import { getMockDevState, requireOnline, subscribeMockBridge } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'

/** Remain pending in the prototype Loading scenario; invalidation cancels the old request. */
export async function playerRequest(signal?: AbortSignal) {
  await delay(200, signal)
  requireOnline()
  if (getMockDevState().leaderboardScenario === 'loading') {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        unsubscribe()
        signal?.removeEventListener('abort', abort)
      }
      const abort = () => {
        cleanup()
        reject(signal?.reason)
      }
      const unsubscribe = subscribeMockBridge(() => {
        if (getMockDevState().leaderboardScenario !== 'loading' || getMockDevState().offline) {
          cleanup()
          resolve()
        }
      })
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
    })
  }
  requireOnline()
  if (getMockDevState().leaderboardScenario === 'error')
    throw new MockError(
      'retryable',
      "Couldn't load the leaderboard. Check your connection, then try again.",
    )
}
