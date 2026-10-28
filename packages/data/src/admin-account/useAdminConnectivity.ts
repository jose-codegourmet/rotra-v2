'use client'
import { useSyncExternalStore } from 'react'
import { subscribeMockBridge } from '../mock/bridge'
import { isAdminOffline } from './connectivity'

function subscribe(listener: () => void) {
  const unsubscribe = subscribeMockBridge(listener)
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => { unsubscribe(); window.removeEventListener('online', listener); window.removeEventListener('offline', listener) }
}
const serverSnapshot = () => false
export function useAdminConnectivity() {
  return { offline: useSyncExternalStore(subscribe, isAdminOffline, serverSnapshot) }
}
