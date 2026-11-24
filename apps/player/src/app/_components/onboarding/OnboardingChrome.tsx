'use client'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setOnboardingFullscreen } from '@/store/slices/uiSlice'

/**
 * Renders nothing. While it is mounted the player shell hides its top bar, bands and dock, so the
 * fullscreen onboarding (P-ONBOARD) shows only its own header and footer.
 */
export function OnboardingChrome() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(setOnboardingFullscreen(true))
    return () => void dispatch(setOnboardingFullscreen(false))
  }, [dispatch])
  return null
}
