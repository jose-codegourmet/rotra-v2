'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { useLiveUpdates } from '@rotra/data/live/useLiveUpdates'

/**
 * Live updates for the Player app (live-updates R3): the signed-in Player's own topic. Renders nothing;
 * the Refresh bar, pull-down and tab-return refresh are untouched.
 */
export function LiveBridge() {
  const playerId = useSession('player').data?.account.id
  useLiveUpdates(playerId ? [`player:${playerId}`] : [])
  return null
}
