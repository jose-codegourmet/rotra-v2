'use client'
import { useSyncExternalStore } from 'react'
import { getConnectivity, subscribeConnectivity } from './connectivity'

const isOnline = () => getConnectivity() === 'online'
const serverSnapshot = () => true

/** Browser offline or "Simulate offline": one answer for every Queue screen. */
export function useConnectivity() {
  return { online: useSyncExternalStore(subscribeConnectivity, isOnline, serverSnapshot) }
}
