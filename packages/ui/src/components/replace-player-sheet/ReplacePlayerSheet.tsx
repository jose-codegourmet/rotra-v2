'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import {
  pickerPlayer,
  type SwapPickerPlayer,
  SwapPickerSheet,
} from '@rotra/ui/swap-picker-sheet'
import type { ReactNode } from 'react'

/** One player as the Replace player tiles draw them. */
export type ReplacePlayer = {
  /** The SessionPlayer id */
  id: string
  name: string
  /** Nickname or first name under the picture; the first name when omitted */
  shortName?: string
  photoUrl?: string
  /** The level locked for this session; null when none was set */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** Minutes since their last game ended (or since arriving) */
  restMinutes?: number
}

export type ReplacePlayerSheetProps = {
  open: boolean
  matchNo: number
  /** Everyone in the match, Team A first; the "Who's coming out?" tiles */
  inMatch: (ReplacePlayer & { team: 'A' | 'B'; present?: boolean })[]
  /** Present players not in this match and not busy: Suggested and the top of All players */
  candidates: ReplacePlayer[]
  /** Everyone else on tonight's roster (away, on court or playing): greyed out in All players */
  others?: SwapPickerPlayer[]
  /** The session's minimum games */
  minimumGames: number
  /**
   * The match is Playing: Replace fixes a mistake (the replacement is recorded as having played the
   * whole game, no substitution, no credit choice). Otherwise it is On court: a lineup change.
   */
  playing?: boolean
  /** The player coming out; null until chosen */
  outId: string | null
  /** The replacement; null until chosen */
  inId: string | null
  onPickOut: (playerId: string) => void
  onPickIn: (playerId: string) => void
  /** The × ("Back to match N") and the backdrop return to the match without changing anything */
  onBack: () => void
  /** Replace player: the owner rechecks and runs the lineup change */
  onConfirm: () => void
  /** The change is saving: Replace player cannot fire twice and the picker cannot be dismissed */
  isPending?: boolean
  /** e.g. "Something changed. Review the match again." after a failed recheck */
  message?: ReactNode
  /** Why the change could not be saved ("Changes could not be saved"); nothing changed */
  error?: ReactNode
}

/**
 * "Replace a player in match N" in the SwapPickerSheet: Who's coming out?, Suggested (and All
 * players behind Other), then the note and Replace player (needs both players). Before Start it is
 * a lineup change; during play the "Replace fixes a mistake" notice says the replacement gets the
 * whole game and the player taken out gets nothing. No credit question either way.
 */
export function ReplacePlayerSheet({
  open,
  matchNo,
  inMatch,
  candidates,
  others = [],
  minimumGames,
  playing = false,
  outId,
  inId,
  onPickOut,
  onPickIn,
  onBack,
  onConfirm,
  isPending = false,
  message,
  error,
}: ReplacePlayerSheetProps) {
  const title = `Replace a player in match ${matchNo}`
  return (
    <SwapPickerSheet
      open={open}
      matchNo={matchNo}
      title={title}
      outLabel="Who's coming out?"
      inMatch={inMatch.map((p) => ({
        ...pickerPlayer(p, p.present === false ? 'away' : 'playing'),
        team: p.team,
      }))}
      players={[...candidates.map((p) => pickerPlayer(p)), ...others]}
      minimumGames={minimumGames}
      outId={outId}
      inId={inId}
      onPickOut={onPickOut}
      onPickIn={onPickIn}
      onBack={onBack}
      isPending={isPending}
      message={message}
      error={error}
      extra={
        playing ? (
          <Notice>
            <b>Replace fixes a mistake.</b> Use it when the wrong player was put in this match. The
            record shows the replacement played the whole game, and the player taken out gets no
            game from it. If someone really has to leave mid-game, use <b>Substitute player</b>{' '}
            instead, which keeps both on the record.
          </Notice>
        ) : (
          <p className="m-0 text-[13px] text-fg2">
            The match hasn't started, so this is a lineup change. The replacement plays the whole
            game; it isn't recorded as a substitution.
          </p>
        )
      }
      action={
        <Button variant="primary" loading={isPending} disabled={!outId || !inId} onClick={onConfirm}>
          Replace player
        </Button>
      }
    />
  )
}
