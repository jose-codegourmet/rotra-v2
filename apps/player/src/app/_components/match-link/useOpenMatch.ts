'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Where the match page's back button goes (2026-11-25 match page log): the page a game court was
 * tapped on, labelled with it (the player's name, Games, Sessions). Kept for this tab only and only
 * for the match it opened (and the matches opened from its Before this game courts), so a match
 * page opened from a link reads Leaderboard.
 */
export type MatchFrom = { href: string; label: string; matchId: string }
const KEY = 'rotra.player.matchFrom'
export const matchHref = (matchId: string) => `/matches/${encodeURIComponent(matchId)}`

function write(from: MatchFrom) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(from))
  } catch {
    // Storage blocked: the back button reads Leaderboard.
  }
}

/** The page this match page was opened from, when it was opened from a court in this tab. */
export function readMatchFrom(matchId: string): MatchFrom | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const from = raw ? (JSON.parse(raw) as MatchFrom) : null
    return from && from.matchId === matchId && typeof from.href === 'string' ? from : null
  } catch {
    return null
  }
}

export function clearMatchFrom() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing kept.
  }
}

/** A court tap on a page other than the match page: remember this page as the back target, then open the game. */
export function useOpenMatch(label: string) {
  const router = useRouter()
  const pathname = usePathname()
  return useCallback(
    (matchId: string) => {
      write({ href: pathname, label, matchId })
      router.push(matchHref(matchId))
    },
    [router, pathname, label],
  )
}

/** A court tap on the match page itself: the back target stays the page the first court was on. */
export function openMatchFromMatch(
  router: ReturnType<typeof useRouter>,
  current: string,
  matchId: string,
) {
  const from = readMatchFrom(current)
  if (from) write({ ...from, matchId })
  router.push(matchHref(matchId))
}
