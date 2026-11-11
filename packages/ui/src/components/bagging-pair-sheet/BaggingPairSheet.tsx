'use client'

import { BAGGING_PAGE_SIZE, toggleBaggingGame } from '@rotra/data/match/auto-queue-rules'
import type { BaggingGames } from '@rotra/data/match/auto-queue-types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { BaggingGamesRow } from '@rotra/ui/bagging-games-row'
import type { BaggingPairView, BaggingPlayer } from '@rotra/ui/bagging-pairs-card'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { useEffect, useRef, useState } from 'react'

export type BaggingPairSelection = { a?: string | null; b?: string | null; games?: BaggingGames }

export type BaggingPairSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Every present roster player, in roster order */
  players: BaggingPlayer[]
  /** The pairs already listed, for the replace notice */
  pairs: BaggingPairView[]
  minimumGames: number
  /** Add pair / Replace pair; the caller removes any pair either player was in */
  onAdd: (pair: { a: string; b: string; games: BaggingGames }) => void | Promise<void>
  isPending?: boolean
  /** The picks the sheet opens with (stories); normally empty */
  defaultSelection?: BaggingPairSelection
}

/** The Participants grid ring colours: the level band, or the neutral ring without a level. */
const ringClass = (level: PlayingLevel | null) =>
  ({
    beginner: '[--ring:var(--lv-beg)]',
    intermediate: '[--ring:var(--lv-int)]',
    advanced: '[--ring:var(--lv-adv)]',
  })[level?.split('_')[0] ?? ''] ?? '[--ring:var(--lv-none)]'

/**
 * D-BAGGING-PAIR, the wide Add bagging pair sheet (#739, owner comments of November 11, 2026): two
 * selection slots on top, the Games row, then every present player as a round picture with a level
 * ring, 24 to a page. Tap one player, then their partner; a third tap swaps the partner, tapping a
 * picked player clears them. A pick who is already paired turns the primary into Replace pair.
 */
export function BaggingPairSheet({
  open,
  onOpenChange,
  players,
  pairs,
  minimumGames,
  onAdd,
  isPending = false,
  defaultSelection,
}: BaggingPairSheetProps) {
  const [a, setA] = useState<string | null>(defaultSelection?.a ?? null)
  const [b, setB] = useState<string | null>(defaultSelection?.b ?? null)
  const [games, setGames] = useState<BaggingGames>(defaultSelection?.games ?? 'all')
  const [page, setPage] = useState(0)
  // Every opening starts over, so a closed sheet never keeps yesterday's half pair.
  const wasOpen = useRef(open)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setA(defaultSelection?.a ?? null)
      setB(defaultSelection?.b ?? null)
      setGames(defaultSelection?.games ?? 'all')
      setPage(0)
    }
    wasOpen.current = open
  }, [open, defaultSelection])

  const pageCount = Math.max(1, Math.ceil(players.length / BAGGING_PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const shown = players.slice(current * BAGGING_PAGE_SIZE, (current + 1) * BAGGING_PAGE_SIZE)
  const playerOf = (id: string | null) => (id ? players.find((p) => p.id === id) : undefined)
  const tap = (id: string) => {
    if (a === id) {
      setA(b)
      setB(null)
    } else if (b === id) setB(null)
    else if (!a) setA(id)
    else setB(id)
  }
  const clashes = [a, b]
    .map((id) => {
      if (!id) return null
      const pair = pairs.find((p) => p.a.id === id || p.b.id === id)
      if (!pair) return null
      const me = pair.a.id === id ? pair.a : pair.b,
        partner = pair.a.id === id ? pair.b : pair.a
      // The partner stays paired with the same player: nothing to replace.
      if (partner.id === a || partner.id === b) return null
      return `${me.shortName} is already paired with ${partner.shortName}. Adding this pair replaces it.`
    })
    .filter((text): text is string => Boolean(text))
  const complete = Boolean(a && b && a !== b)

  const slot = (id: string | null, n: 1 | 2) => {
    const player = playerOf(id)
    return player ? (
      <button
        key={n}
        type="button"
        disabled={isPending}
        aria-label={`Selection ${n}: ${player.name}. Tap to clear`}
        onClick={() => tap(player.id)}
        className={cn(
          'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-accent bg-accent-subtle px-2.5 py-2 text-left text-fg',
          'disabled:cursor-not-allowed disabled:opacity-45',
          ringClass(player.level),
        )}
      >
        <Avatar
          name={player.name}
          src={player.photoUrl}
          className="outline-[3px] outline-offset-2 outline-(--ring)"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate">{player.name}</b>
        </span>
        <Icon name="x" className="text-fg2" aria-hidden="true" />
      </button>
    ) : (
      <div
        key={n}
        className="flex min-w-0 items-center gap-2.5 rounded-lg border border-dashed border-border-strong bg-bg px-2.5 py-2"
      >
        <span
          aria-hidden="true"
          className="inline-grid size-9 flex-none place-items-center rounded-full bg-elev text-[13px] font-bold text-fg2"
        >
          {n}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="text-fg2">Selection {n}</b>
          <span className="text-[13px] text-fg2">
            {n === 1 ? 'Tap a player below' : 'Then their partner'}
          </span>
        </span>
      </div>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return
        onOpenChange(next)
      }}
      title="Add bagging pair"
      wide
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!complete || isPending}
            onClick={() => {
              if (a && b) void onAdd({ a, b, games })
            }}
          >
            {clashes.length ? 'Replace pair' : 'Add pair'}
          </Button>
        </>
      }
    >
      {players.length < 2 ? (
        <Notice tone="info">Mark at least two players present first.</Notice>
      ) : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {slot(a, 1)}
        {slot(b, 2)}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg2">
          Games · the ones they play together, or ALL
        </span>
        <BaggingGamesRow
          games={games}
          minimumGames={minimumGames}
          disabled={isPending}
          aria-label="Games"
          onToggle={(value) => setGames((g) => toggleBaggingGame(g, value, minimumGames))}
        />
      </div>
      <hr className="m-0 border-0 border-t border-border" />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-[13px] font-semibold text-fg2">
          Present players · {players.length}
        </span>
        {pageCount > 1 ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="xs"
              disabled={isPending || current === 0}
              onClick={() => setPage(current - 1)}
            >
              <Icon name="back" /> Previous
            </Button>
            <span className="text-[13px] text-fg2" aria-live="polite">
              Page {current + 1} of {pageCount}
            </span>
            <Button
              size="xs"
              disabled={isPending || current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
      <fieldset className="m-0 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-1.5 gap-y-2.5 border-0 p-0">
        <legend className="sr-only">
          Present players, page {current + 1} of {pageCount}
        </legend>
        {shown.map((player) => {
          const n = a === player.id ? 1 : b === player.id ? 2 : 0
          return (
            <button
              key={player.id}
              type="button"
              disabled={isPending}
              aria-pressed={n > 0}
              aria-label={`${player.name}${player.levelLabel ? `, ${player.levelLabel}` : ''}${n ? `, picked ${n === 1 ? 'first' : 'second'}` : ''}`}
              onClick={() => tap(player.id)}
              className={cn(
                'flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg border-0 bg-transparent px-0.5 pt-1.5 pb-2 text-center text-fg',
                'disabled:cursor-not-allowed disabled:opacity-45',
                n > 0 && 'bg-accent-subtle',
                ringClass(player.level),
              )}
            >
              <span className="relative inline-block">
                <Avatar
                  name={player.name}
                  src={player.photoUrl}
                  className={cn(
                    'mt-1.5 size-14 text-lg outline-4 outline-offset-4',
                    n > 0 ? 'outline-accent' : 'outline-(--ring)',
                  )}
                />
                {n ? (
                  <i
                    aria-hidden="true"
                    className="absolute -right-1.5 -bottom-1 grid size-[22px] place-items-center rounded-full bg-accent text-xs not-italic font-extrabold text-on-accent shadow-[0_0_0_2px_var(--surface)]"
                  >
                    {n}
                  </i>
                ) : null}
              </span>
              <b className="block max-w-full text-[17px] leading-[1.25] [overflow-wrap:anywhere]">
                {player.shortName}
              </b>
            </button>
          )
        })}
      </fieldset>
      <hr className="m-0 border-0 border-t border-border" />
      {clashes.map((text) => (
        <Notice key={text} tone="warn">
          {text}
        </Notice>
      ))}
    </Sheet>
  )
}
