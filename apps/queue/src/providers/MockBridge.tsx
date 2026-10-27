'use client'
import { connectMockBridge, notifyMockBridge } from '@rotra/data/mock/bridge'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAppStore } from '@/store/hooks'
import { setDevToggle } from '@/store/slices/devSlice'

/** Feeds the Redux dev toggles into the mock data layer; mounted once by AppProviders. */
export function MockBridge() {
  const store = useAppStore()
  const client = useQueryClient()
  useEffect(() => {
    const disconnect = connectMockBridge({
      read: () => store.getState().dev,
      consume: (key) => store.dispatch(setDevToggle({ key, value: false })),
    })
    let previous = store.getState().dev
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().dev
      if (next !== previous) {
        previous = next
        notifyMockBridge()
        void client.invalidateQueries()
      }
    })
    return () => {
      unsubscribe()
      disconnect()
    }
  }, [store, client])
  return null
}
