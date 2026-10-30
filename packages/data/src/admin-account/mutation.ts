import { delay } from '../mock/latency'
import { type MockState, mockStore } from '../mock/store'
import { requireAdminOnline } from './fetchers'

/**
 * One Admin write: refused while offline (before and after the simulated round trip), then applied
 * in a single store update, so a thrown check leaves every record, audit line included, unchanged.
 */
export async function adminMutation<T>(
  milliseconds: number,
  change: (draft: MockState) => T,
): Promise<T> {
  requireAdminOnline()
  await delay(milliseconds)
  requireAdminOnline()
  let result: { value: T } | undefined
  mockStore.update((draft) => {
    result = { value: change(draft) }
  })
  if (!result) throw new Error('Admin mutation produced no result.')
  return result.value
}
