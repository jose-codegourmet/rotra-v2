'use client'

import {
  activeMatchFor,
  allPlayers,
  countsFor,
  FORMAT_LABELS,
  gamesAdjustmentOf,
  gamesPlayedFor,
  queueMasterName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { isUpset, winChance } from '@rotra/data/match/win-chance'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import {
  SessionGamesDialog,
  type SessionGamesMatch,
  type SessionGamesTab,
} from '@rotra/ui/session-games-dialog'
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { useWinChanceDialog } from '@/app/(operator)/sessions/[sessionId]/_components/win-chance/useWinChanceDialog'
import { useClubPlayerPictures } from '@/lib/useClubPlayerPictures'

type PlayerGamesApi = {
  /** Opens "NAME's games" for a session roster player (the id on a face), on the Matches pill */
  open: (playerId: string) => void
}

const PlayerGamesContext = createContext<PlayerGamesApi>({ open: () => {} })

/**
 * Opens D-SESSION-GAMES from a games badge. Call `open(rosterPlayerId)` with the roster id a face
 * carries (court faces, Main Queue tiles, Generate Queue draft tiles). Outside a PlayerGamesProvider
 * it does nothing.
 */
export const usePlayerGames = () => useContext(PlayerGamesContext)

export type PlayerGamesProviderProps = {
  sessionId: string
  children: ReactNode
}

/**
 * D-SESSION-GAMES container (Q-CONSOLE, Q-COURTS, Q-QUEUE): one SessionGamesDialog per console,
 * built from the session's finished matches (completed and invalid), the player's waiting Main
 * Queue matches and the roster (useSessionMatches, useSessionRoster, useQueueSession). A face in the
 * dialog closes it and opens that player's profile with "Back to games", which reopens the dialog on
 * the same pill. Mount once around the console; views reach it through `usePlayerGames`.
 */
export function PlayerGamesProvider({ sessionId, children }: PlayerGamesProviderProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const { pictureOf } = useClubPlayerPictures()
  const winChanceDialog = useWinChanceDialog(roster.data?.roster, matches.data)
  /** The roster id whose games are shown; kept while the profile is open so Back can return */
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<SessionGamesTab>('matches')
  const [profileId, setProfileId] = useState<string | null>(null)

  const openGames = useCallback((id: string) => {
    setTab('matches')
    setProfileId(null)
    setPlayerId(id)
    setOpen(true)
  }, [])
  const api = useMemo(() => ({ open: openGames }), [openGames])

  const rosterList = roster.data?.roster
  const matchList = matches.data
  const s = session.data
  const me = playerId ? rosterList?.find((p) => p.id === playerId) : undefined

  const face = (id: string): CourtPlayer => {
    const p = rosterList?.find((x) => x.id === id)
    return p
      ? {
          id,
          name: p.nameSnapshot,
          shortName: queueMasterName(p),
          level: p.level ?? null,
          photoUrl: pictureOf(p.clubPlayerId),
        }
      : { id, name: 'Player', shortName: 'Player', level: null }
  }
  const courtLabel = (ids: string[]) =>
    ids.map((id) => s?.courts.find((c) => c.id === id)?.label ?? 'Court').join(' + ')

  let dialog: ReactNode = null
  if (me && rosterList && matchList && s) {
    const finished: SessionGamesMatch[] = matchList
      .filter(
        (m) =>
          (m.state === 'completed' || m.state === 'invalid') &&
          m.startedAt != null &&
          (allPlayers(m).includes(me.id) ||
            m.substitutions.some((sub) => sub.outId === me.id || sub.inId === me.id)),
      )
      .map(
        (m): SessionGamesMatch => ({
          id: m.id,
          number: m.matchNo,
          courtLabel: courtLabel(m.courtIds),
          startedAt: m.startedAt ?? 0,
          endedAt: m.endedAt ?? m.startedAt ?? 0,
          counting:
            m.state === 'invalid' ? 'invalid' : countsFor(m, me.id) ? 'counts' : 'not-counted',
          fun: m.format.startsWith('fun_'),
          teamA: m.teamA.map(face),
          teamB: m.teamB.map(face),
          winChance: winChance(m, rosterList, matchList),
          upset: isUpset(m, rosterList),
          winningTeam: m.decision?.winningTeam ?? null,
          score:
            m.decision?.teamAScore != null && m.decision.teamBScore != null
              ? { teamA: m.decision.teamAScore, teamB: m.decision.teamBScore }
              : null,
          games: m.decision?.games?.length ? m.decision.games : null,
          substitutionCredits: m.substitutions.map((sub) => ({
            outName: face(sub.outId).name,
            inName: face(sub.inId).name,
            creditTo: !sub.creditTo || sub.creditTo === 'none' ? 'nobody' : sub.creditTo,
          })),
        }),
      )
    const planned = waitingMatches(matchList).flatMap((m, index) =>
      allPlayers(m).includes(me.id)
        ? [
            {
              id: m.id,
              position: index + 1,
              matchesAhead: index,
              formatLabel: FORMAT_LABELS[m.format],
              teamA: m.teamA.map(face),
              teamB: m.teamB.map(face),
              winChance: winChance(m, rosterList, matchList),
            },
          ]
        : [],
    )
    const busy = activeMatchFor(me.id, matchList)
    dialog = (
      <SessionGamesDialog
        open={open && profileId === null}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setPlayerId(null)
        }}
        player={face(me.id)}
        matches={finished}
        planned={planned}
        gamesPlayed={gamesPlayedFor(me.id, { roster: rosterList, matches: matchList })}
        setByHand={gamesAdjustmentOf(me)}
        onCourt={
          busy
            ? {
                status: busy.state === 'on_court' ? 'getting-ready' : 'playing',
                courtLabel: courtLabel(busy.courtIds),
                matchNumber: busy.matchNo,
              }
            : null
        }
        onOpenWinChance={(matchId) =>
          winChanceDialog.open((all) => all.find((x) => x.id === matchId))
        }
        tab={tab}
        onTabChange={setTab}
        onOpenProfile={(rosterId) => {
          const clubPlayerId = rosterList.find((p) => p.id === rosterId)?.clubPlayerId
          if (clubPlayerId) setProfileId(clubPlayerId)
        }}
      />
    )
  }

  return (
    <PlayerGamesContext.Provider value={api}>
      {children}
      {dialog}
      {winChanceDialog.dialog}
      <PlayerProfile
        clubPlayerId={profileId}
        onClose={() => {
          setProfileId(null)
          setOpen(false)
          setPlayerId(null)
        }}
        backLabel="games"
        onBack={() => setProfileId(null)}
      />
    </PlayerGamesContext.Provider>
  )
}
