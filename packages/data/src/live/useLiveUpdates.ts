'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { isRealDataMode } from '../real/mode'
import { invalidateForChange, invalidateTopics } from './invalidateForChange'
import { startLiveStream } from './liveStream'
import { noteSnapshotVersion } from './snapshotVersion'
import { liveStreamOrigin } from './streamOrigin'

const PUBLIC_PREFIX = 'public-session:'

/**
 * Live updates (R3): keeps one stream open for `topics` and marks the matching TanStack Query reads
 * stale when one changes, so the screen re-reads by itself. Does nothing in mock mode, without
 * `NEXT_PUBLIC_ROTRA_STREAM_URL`, or with no topics. Refresh, pull-down and tab-return refresh stay as
 * they are; this only adds the push. The snapshot version goes into the next read's request
 * (`minVersion`), never into a query key.
 *
 * Pass topics from what the screen already knows (route and signed-in account); the stream reopens
 * when the list changes and closes on unmount.
 */
export function useLiveUpdates(topics: readonly string[]) {
  const client = useQueryClient()
  const key = [...new Set(topics)].sort().join('\n')
  useEffect(() => {
    const origin = liveStreamOrigin()
    if (!origin || !isRealDataMode() || key === '') return
    const list = key.split('\n')
    return startLiveStream({
      origin,
      topics: list,
      onReady: (resumed) => {
        if (!resumed) invalidateTopics(client, list)
      },
      onChanged: ({ topic, version, kind }) => {
        if (version !== null && topic.startsWith(PUBLIC_PREFIX))
          noteSnapshotVersion(topic.slice(PUBLIC_PREFIX.length), version)
        invalidateForChange(client, topic, kind)
      },
    })
  }, [client, key])
}
