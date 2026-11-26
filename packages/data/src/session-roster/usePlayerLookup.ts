'use client'
import { useQuery } from '@tanstack/react-query'
import { lookupPlayer } from './mutations'
import { sessionRosterKeys } from './queryKeys'

/**
 * Add player › Player Information (D-2026-11-16-04): the one ROTRA player whose RTR ID or email is
 * exactly `q`. `data.player` is the match to add (`ownNameRequired` for another club's unclaimed
 * player: pass the club's own name as `name` to the add); `data.savedName` is set instead when they
 * are already in this club's saved players. With no exact match, `data.matches` lists unclaimed
 * players whose name contains `q` (D-2026-11-23-01). Online only.
 */
export function usePlayerLookup(q: string) {
  return useQuery({
    queryKey: sessionRosterKeys.lookup(q),
    queryFn: () => lookupPlayer(q),
  })
}
