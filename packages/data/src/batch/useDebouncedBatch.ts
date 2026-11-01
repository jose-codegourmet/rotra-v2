'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { DebouncedBatch } from './debouncedBatch'
import { connectBatchLifecycle } from './lifecycle'

const serverSnapshot = () => 0

/** Subscribe to shared transient intent; navigation starts a flush without discarding the controller. */
export function useDebouncedBatch<Key, Value>(batch: DebouncedBatch<Key, Value>) {
  useSyncExternalStore(batch.subscribe, batch.getSnapshot, serverSnapshot)
  useEffect(() => connectBatchLifecycle(batch), [batch])
  return batch
}
