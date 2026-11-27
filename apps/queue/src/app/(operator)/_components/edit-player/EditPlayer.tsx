'use client'

import type { ClubPlayer } from '@rotra/data/club-player/types'
import { useRenameClubPlayer } from '@rotra/data/club-player/useRenameClubPlayer'
import { useSetClubNickname } from '@rotra/data/club-player/useSetClubNickname'
import { MockError } from '@rotra/data/mock/errors'
import { sameHandicap } from '@rotra/data/session-roster/handicap'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSetGamesPlayed } from '@rotra/data/session-roster/useSetGamesPlayed'
import { useSetHandicap } from '@rotra/data/session-roster/useSetHandicap'
import { useSetPresence } from '@rotra/data/session-roster/useSetPresence'
import { EditLivePlayerSheet } from '@rotra/ui/edit-live-player-sheet'
import type { EditLivePlayerFormValues } from '@rotra/ui/edit-live-player-sheet/schema'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

export type EditPlayerProps = {
  sessionId: string
  /** `live`: the Players card pencil; `preparing`: the Roster and levels pencil (nickname and handicap only) */
  mode: 'live' | 'preparing'
  entry: SessionPlayer
  /** The saved player: identity and nicknames */
  clubPlayer: Pick<ClubPlayer, 'identity' | 'nickname' | 'clubNickname'> | undefined
  photoUrl?: string
  /** The games played the card shows now (live only) */
  games?: number
  /** Live only: the player's match, for the tonight chip */
  match?: { status: 'playing' | 'oncourt'; courtLabel: string } | null
  /** Live only: wait for queued presence changes before saving presence */
  flushPresence?: () => Promise<unknown>
  onClose: () => void
}

const errorMessage = (error: unknown) =>
  error instanceof MockError
    ? (error.fieldErrors?.nickname ?? error.message)
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Try again.'

/**
 * Edit player (D-EDIT-LIVE-PLAYER; mockup change 2026-11-27): EditLivePlayerSheet for one roster
 * entry. Save changes applies only what changed, each through the hook its own screen uses: the
 * club nickname (registered: useSetClubNickname; unclaimed and guest: useRenameClubPlayer with the
 * full name unchanged), the handicap (useSetHandicap) and, live only, games played and presence.
 * Toasts "Changes saved · NAME" or "No changes"; a failure keeps the sheet open with the edits.
 */
export function EditPlayer({
  sessionId,
  mode,
  entry,
  clubPlayer,
  photoUrl,
  games = 0,
  match = null,
  flushPresence,
  onClose,
}: EditPlayerProps) {
  const setGamesPlayed = useSetGamesPlayed()
  const setHandicap = useSetHandicap()
  const setPresence = useSetPresence()
  const setClubNickname = useSetClubNickname()
  const renameClubPlayer = useRenameClubPlayer()
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)

  const kind =
    clubPlayer?.identity === 'registered'
      ? 'registered'
      : clubPlayer?.identity === 'unclaimed'
        ? 'unclaimed'
        : 'guest'
  const clubNickname = entry.clubNickname ?? clubPlayer?.clubNickname ?? null
  // An unclaimed or guest player has one nickname (the club's own); a registered one has a Club nickname.
  const nickname =
    kind === 'registered' ? clubNickname : (clubPlayer?.nickname ?? entry.nicknameSnapshot ?? null)
  const shownGames = Math.min(99, games)

  const save = async (values: EditLivePlayerFormValues) => {
    if (pending) return
    setError(undefined)
    setPending(true)
    let changed = false
    try {
      if (kind !== 'registered') {
        const next = values.nickname.replace(/\s+/g, ' ').trim()
        if (next !== (nickname ?? '')) {
          await renameClubPlayer.mutateAsync({
            clubPlayerId: entry.clubPlayerId,
            fullName: entry.nameSnapshot,
            nickname: next,
          })
          changed = true
        }
      } else if (values.nickname !== (clubNickname ?? '')) {
        await setClubNickname.mutateAsync({
          clubPlayerId: entry.clubPlayerId,
          clubNickname: values.nickname,
        })
        changed = true
      }
      if (mode === 'live' && values.games !== shownGames) {
        await setGamesPlayed.mutateAsync({
          sessionId,
          rosterId: entry.id,
          games: values.games,
          operationId: crypto.randomUUID(),
        })
        changed = true
      }
      // Handicap · tonight (D-2026-11-25-03): the whole set, only when it changed.
      if (!sameHandicap(values.spots, entry.handicapSpots ?? [])) {
        await setHandicap.mutateAsync({
          sessionId,
          rosterId: entry.id,
          spots: values.spots,
          operationId: crypto.randomUUID(),
        })
        changed = true
      }
      if (mode === 'live' && values.present !== entry.present) {
        await flushPresence?.()
        await setPresence.mutateAsync({ sessionId, rosterId: entry.id, present: values.present })
        changed = true
      }
    } catch (failure) {
      setError(errorMessage(failure))
      setPending(false)
      return
    }
    setPending(false)
    onClose()
    toast(changed ? `Changes saved · ${entry.nameSnapshot}` : 'No changes')
  }

  return (
    <EditLivePlayerSheet
      open
      mode={mode}
      shownName={clubNickname?.trim() || entry.nicknameSnapshot || entry.nameSnapshot}
      fullName={entry.nameSnapshot}
      kind={kind}
      level={entry.level}
      photoUrl={photoUrl}
      match={match}
      clubNickname={nickname}
      accountNickname={kind === 'registered' ? (clubPlayer?.nickname ?? null) : null}
      games={shownGames}
      present={entry.present}
      handicapSpots={entry.handicapSpots}
      isPending={pending}
      error={error}
      onSave={(values) => void save(values)}
      onCancel={() => {
        if (!pending) onClose()
      }}
    />
  )
}
