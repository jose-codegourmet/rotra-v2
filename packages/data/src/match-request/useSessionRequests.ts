'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionRequests } from './fetchers'
import { matchRequestKeys } from './queryKeys'
/**
 * Q-REQUESTS, the Queue Master's side of the player-facing requests (Q18). Real mode: match
 * requests only (join requests stay on `useSessionRoster` there).
 *
 * `data: SessionRequests`:
 * - `counts.total`: pending join requests + open drop-out notices + open match requests. No tabs
 *   (D-2026-11-11-11): `counts.join` (join requests + drop-out notices) is the preparation card's
 *   **Requests · N**, `counts.match` the live console's **Match requests · N**;
 *   `counts.joinRequests` and `counts.dropOuts` split the first.
 * - `join`: pending join requests, oldest first, each a `SessionJoinRequest` plus `account`
 *   (`null` for a guest; `{ playerId, inClub }`: `inClub` true reads “ROTRA player · already in
 *   your club”, false “ROTRA player · new to your club”) and `invitedByName` (“Invited by NAME”, or
 *   null).
 * - `dropOuts`: open drop-out notices, oldest first (“Can't make it · N”), each a `DropOutNotice`
 *   plus the roster `name` and `nickname`; `pid` is the roster row for Remove from roster.
 * - `match`: open match requests, oldest first: `format`, `at`, `requester`, `partners[]` and
 *   `opponents[]` (one per spot the format needs; `null` = “Anyone”). Each named spot has `name`,
 *   `nickname`, `level`, `games` (counted so far, read against `minimum`) and `where`
 *   (`{ kind: 'court', courtLabels }` → “On Court 2”, `{ kind: 'queue', position }` → “In queue #3”,
 *   or null).
 * - `minimum`: the session's minimum games.
 * - `selfCheckIn`: roster row id → `{ kind: 'checked-in' | 'left', at }` for “Checked in themselves ·
 *   TIME” / “Left · TIME”; the QM's later presence change clears it.
 *
 * Finished, invalid and cancelled sessions return empty lists (their requests are closed, kept).
 * Every mutation through `useMockMutation` refreshes it with the other queries.
 */
export function useSessionRequests(sessionId: string) {
  return useQuery({
    queryKey: matchRequestKeys.sessionRequests(sessionId),
    queryFn: () => getSessionRequests(sessionId),
    enabled: sessionId !== '',
  })
}
