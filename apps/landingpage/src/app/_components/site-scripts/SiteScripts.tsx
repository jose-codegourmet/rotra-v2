'use client'
import { useEffect } from 'react'
import { initBoot } from '@/scripts/boot'
import { initRive } from '@/scripts/rive'
import { initSite } from '@/scripts/site'
import { initVignettes } from '@/scripts/vignettes'

// Once per page load: StrictMode runs effects twice in dev, and the scripts must not.
let started = false

/**
 * Runs the page scripts once, in the order the old index.html had them, after hydration.
 * They mutate the server-rendered markup directly; nothing here re-renders it.
 */
export function SiteScripts() {
  useEffect(() => {
    if (started) return
    started = true
    initSite()
    initRive()
    initVignettes()
    initBoot()
  }, [])
  return null
}
