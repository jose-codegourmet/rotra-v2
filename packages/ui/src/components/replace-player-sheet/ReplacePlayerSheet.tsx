'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { pickerPlayer, type SwapPickerPlayer, SwapPickerSheet } from '@rotra/ui/swap-picker-sheet'
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
  /** The match number for the default title and back label; omit with `title` and `backLabel` */
  matchNo?: number
  /** The title; "Replace a player in match N" by default ("Replace a player in the suggested match") */
  title?: string
  /**
   * The line under Suggestion; the lineup-change or Replace-mistake text by default. The suggested
   * match passes "This only changes the suggested lineup. Nothing is recorded until you add it to
   * the queue."
   */
  note?: ReactNode
  /** The × button's accessible name; "Back to match N" by default ("Back to the suggested match") */
  backLabel?: string
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
  /**
   * "Swap from match" (Replace only): the player coming out trades places with one of their
   * opponents in this match, so the pairs change and nobody new comes in. The row shows only when
   * onPickSwap is given; its tiles are the opponents of the player coming out, derived from inMatch.
   */
  onPickSwap?: (opponentId: string) => void
  /** The opponent picked to swap with; null for none. Picking one from Suggestion or All players clears it (the owner owns this) */
  swapId?: string | null
  /** Swap players: the owner swaps the two inside the match. Needs outId and swapId */
  onSwapFromMatch?: (outId: string, opponentId: string) => void
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
 * "Replace a player in match N" in the SwapPickerSheet: Who's coming out?, Swap from match (when
 * offered), Suggestion (and All players behind Other), then the note and Replace player (needs both
 * players). Picking an opponent under Swap from match turns the action into Swap players. Before Start it is
 * a lineup change; during play the "Replace fixes a mistake" notice says the replacement gets the
 * whole game and the player taken out gets nothing. No credit question either way.
 */
export function ReplacePlayerSheet({
  open,
  matchNo,
  title = `Replace a player in match ${matchNo}`,
  note,
  backLabel,
  inMatch,
  candidates,
  others = [],
  minimumGames,
  playing = false,
  outId,
  inId,
  onPickOut,
  onPickIn,
  onPickSwap,
  swapId = null,
  onSwapFromMatch,
  onBack,
  onConfirm,
  isPending = false,
  message,
  error,
}: ReplacePlayerSheetProps) {
  const out = inMatch.find((p) => p.id === outId)
  const opponent = out ? inMatch.find((p) => p.id === swapId && p.team !== out.team) : undefined
  const swapping = !!(onPickSwap && out && opponent)
  const short = (p: ReplacePlayer) => p.shortName ?? p.name.split(' ')[0] ?? p.name
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
      swapFrom={
        onPickSwap
          ? {
              opponents: out
                ? inMatch
                    .filter((p) => p.team !== out.team)
                    .map((p) => ({ ...pickerPlayer(p, 'free'), team: p.team }))
                : null,
              pickedId: opponent?.id ?? null,
              onPick: onPickSwap,
            }
          : undefined
      }
      onBack={onBack}
      backLabel={backLabel}
      isPending={isPending}
      message={message}
      error={error}
      extra={
        swapping && out && opponent ? (
          <p className="m-0 text-[13px] text-fg2">
            {short(out)} and {short(opponent)} swap places: each joins the other's partner.
          </p>
        ) : note ? (
          <p className="m-0 text-[13px] text-fg2">{note}</p>
        ) : playing ? (
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
        <Button
          variant="primary"
          loading={isPending}
          disabled={swapping ? false : !outId || !inId}
          onClick={() => {
            if (swapping && outId && opponent) onSwapFromMatch?.(outId, opponent.id)
            else onConfirm()
          }}
        >
          {swapping ? 'Swap players' : 'Replace player'}
        </Button>
      }
    />
  )
}
