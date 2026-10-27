'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query matches, kept in sync as the window changes. Server render and first
 * hydration assume false, so pass queries whose false case is the safe default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** The prototypes' phone breakpoint: sheets dock to the bottom and tabs share the width. */
export const PHONE_QUERY = '(max-width: 640px)'
