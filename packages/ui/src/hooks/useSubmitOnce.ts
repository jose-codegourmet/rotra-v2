'use client'
import { useCallback, useEffect, useRef } from 'react'
/**
 * Lets one submit through per attempt. React Hook Form validates asynchronously, so a fast double
 * tap can reach onSubmit twice before the parent re-renders with isPending; this closes that gap.
 * The next attempt opens once isPending returns to false (saved, failed or offline).
 */
export function useSubmitOnce(isPending: boolean) {
  const submitted = useRef(false)
  useEffect(() => {
    if (!isPending) submitted.current = false
  }, [isPending])
  return useCallback(
    (submit: () => void) => {
      if (submitted.current || isPending) return
      submitted.current = true
      submit()
    },
    [isPending],
  )
}
