'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { useLiveUpdates } from '@rotra/data/live/useLiveUpdates'
import { usePathname } from 'next/navigation'

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const SESSION_PATH = new RegExp(`^/sessions/(${UUID})(?:/|$)`)
const PUBLIC_PATH = /^\/s\/([A-Za-z0-9_-]+)\/?$/

/**
 * Live updates for the Queue app (live-updates R3): the signed-in club's topic, the session on screen
 * (`/sessions/<id>`) and, on a public session page, that page's topic. Renders nothing; the Refresh bar,
 * pull-down and tab-return refresh are untouched.
 */
export function LiveBridge() {
  const pathname = usePathname() ?? ''
  const clubId = useSession('club').data?.account.id
  const topics: string[] = []
  if (clubId) topics.push(`club:${clubId}`)
  const sessionId = SESSION_PATH.exec(pathname)?.[1]
  if (clubId && sessionId) topics.push(`session:${sessionId.toLowerCase()}`)
  const slug = PUBLIC_PATH.exec(pathname)?.[1]
  if (slug) topics.push(`public-session:${slug}`)
  useLiveUpdates(topics)
  return null
}
