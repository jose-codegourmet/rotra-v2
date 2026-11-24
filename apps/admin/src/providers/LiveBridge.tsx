'use client'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useLiveUpdates } from '@rotra/data/live/useLiveUpdates'

/**
 * Live updates for the Admin app (live-updates R3): the `admin` topic while the owner is signed in.
 * Renders nothing; the Refresh bar, pull-down and tab-return refresh are untouched.
 */
export function LiveBridge() {
  const owner = useAdminSession().data.kind === 'owner'
  useLiveUpdates(owner ? ['admin'] : [])
  return null
}
