'use client'

import { useSyncExternalStore } from 'react'
import { mockStore } from '../mock/store'
import { isPlaceholderFeatureFlagShown, setPlaceholderFeatureFlagShown } from './fetchers'

const serverSnapshot = () => false

/** Development-only: the 'Show a placeholder flag' dev toggle's state, read from the mock store. */
export function usePlaceholderFeatureFlag() {
  return {
    shown: useSyncExternalStore(mockStore.subscribe, isPlaceholderFeatureFlagShown, serverSnapshot),
    setShown: setPlaceholderFeatureFlagShown,
  }
}
