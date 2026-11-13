'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Notice } from '@rotra/ui/notice'
import { Pager } from '@rotra/ui/pager'
import { playerTileVariants } from '@rotra/ui/player-tile/variants'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useState } from 'react'

/** Where a player is right now: free (present, not on a court), away, or busy in another match */
export type SwapPickerStatus = 'free' | 'away' | 'playing' | 'on-court'

/** One player as the picker's compact tiles draw them. */
export type SwapPickerPlayer = {
  /** The SessionPlayer id */
  id: string
  /** Full name, for the accessible name and search */
  name: string
  /** Nickname or first name, under the picture and searched too */
  shortName: string
  photoUrl?: string
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** Minutes since their last game ended (or since arriving) */
  restMinutes: number
  status: SwapPickerStatus
}

export type SwapPickerSheetProps = {
  open: boolean
  matchNo: number
  /** "Replace a player in match N" or "Substitute in match N": the left column's first line */
  title: string
  /** "Who's coming out?" (Replace) or "Who's coming off?" (Substitute) */
  outLabel: string
  /** The match's players, Team A first */
  inMatch: (SwapPickerPlayer & { team: 'A' | 'B' })[]
  /** Everyone else on tonight's roster; free players feed Suggested and lead All players */
  players: SwapPickerPlayer[]
  /** The session's minimum games */
  minimumGames: number
  outId: string | null
  inId: string | null
  onPickOut: (playerId: string) => void
  onPickIn: (playerId: string) => void
  /** Under Suggested: the Replace notice, or the substitution's "Who gets this game?" */
  extra?: ReactNode
  /** The one primary action, the last row of the left column (Replace player / Review substitution) */
  action: ReactNode
  /** The header × ("Back to match N") and a tap on the backdrop return to the match */
  onBack: () => void
  /** Saving: the picker cannot be dismissed */
  isPending?: boolean
  /** e.g. "Something changed. Review the match again." */
  message?: ReactNode
  error?: ReactNode
}

/**
 * A picker tile from the older sheets' player shape (id, name, level, games, rest): the short name
 * defaults to the first name and the status to free.
 */
export function pickerPlayer(
  p: {
    id: string
    name: string
    shortName?: string
    photoUrl?: string
    level: PlayingLevel | null
    games: number
    restMinutes?: number
  },
  status: SwapPickerStatus = 'free',
): SwapPickerPlayer {
  return {
    id: p.id,
    name: p.name,
    shortName: p.shortName ?? p.name.split(' ')[0] ?? p.name,
    photoUrl: p.photoUrl,
    level: p.level,
    games: p.games,
    restMinutes: p.restMinutes ?? 0,
    status,
  }
}

type Band = 'all' | 'beginner' | 'intermediate' | 'advanced'
type Sort = 'wait' | 'games' | 'name'
const PAGE = 24
/** Wide enough for the expanded two-column picker; narrower screens stack All players as a second dialog. */
const WIDE_QUERY = '(min-width: 900px)'
const BAND_DOT: Record<Exclude<Band, 'all'>, string> = {
  beginner: 'bg-lv-beg',
  intermediate: 'bg-lv-int',
  advanced: 'bg-lv-adv',
}
const SORTS: { key: Sort; label: string; reversed: string }[] = [
  { key: 'wait', label: 'Longest wait', reversed: 'Shortest wait' },
  { key: 'games', label: 'Fewest games', reversed: 'Most games' },
  { key: 'name', label: 'Name A–Z', reversed: 'Name Z–A' },
]

const statusLabel = (p: SwapPickerPlayer) =>
  p.status === 'on-court'
    ? 'On court'
    : p.status === 'playing'
      ? 'Playing'
      : p.status === 'away'
        ? 'Away'
        : `rest ${p.restMinutes}m`

/** The prototype's .ptile.sm: picture, first name, "games/minimum · status" */
function Tile({
  player,
  minimumGames,
  note,
  pressed,
  disabled,
  onClick,
  className,
}: {
  player: SwapPickerPlayer
  minimumGames: number
  note?: string
  pressed: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}) {
  const status = note ?? statusLabel(player)
  const busy = player.status === 'playing' || player.status === 'on-court'
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${player.name}, ${player.games} of ${minimumGames} games, ${status}`}
      className={cn(
        playerTileVariants({ state: player.status === 'away' ? 'away' : busy ? 'busy' : 'note' }),
        'gap-0.5 px-1 pt-2.5 pb-2',
        className,
      )}
    >
      <span data-slot="picture" className="mb-1 flex">
        <Avatar name={player.name} src={player.photoUrl} size={44} />
      </span>
      <span className="max-w-full truncate text-[13px] font-bold">{player.shortName}</span>
      <span className="text-[11px] whitespace-nowrap text-fg2">
        {player.games}/{minimumGames} · {status}
      </span>
    </button>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-2">
      <h3 className="m-0 text-sm font-bold">{label}</h3>
      {children}
    </section>
  )
}

/**
 * The player picker for Replace (before and during play) and Substitute (the prototype's
 * swapPicker). It opens compact: the title, Who's coming out/off, Suggested (seven free players
 * with the fewest games, longest rest first on ties, plus a dashed Other tile), the extra choice and
 * the one action. Other shows All players — search, a skill-level filter, a sort that reverses on a
 * second tap, pages of 24, free players first and the rest greyed out — beside the left column on
 * screens 900 px and wider (the dialog widens to about 75% of the screen; Other becomes Hide), or as
 * a second dialog stacked over the picker below 900 px. The × and the backdrop return to the match.
 */
export function SwapPickerSheet({
  open,
  matchNo,
  title,
  outLabel,
  inMatch,
  players,
  minimumGames,
  outId,
  inId,
  onPickOut,
  onPickIn,
  extra,
  action,
  onBack,
  isPending = false,
  message,
  error,
}: SwapPickerSheetProps) {
  const wide = useMediaQuery(WIDE_QUERY)
  const [all, setAll] = useState(false)
  const [query, setQuery] = useState('')
  const [band, setBand] = useState<Band>('all')
  const [sort, setSort] = useState<Sort>('wait')
  const [flip, setFlip] = useState(false)
  const [page, setPage] = useState(1)

  const free = players
    .filter((p) => p.status === 'free')
    .sort((a, b) => a.games - b.games || b.restMinutes - a.restMinutes)
  const top = free.slice(0, 7)
  const picked = inId && !top.some((p) => p.id === inId) && free.find((p) => p.id === inId)
  const suggested = picked ? [picked, ...top.slice(0, 6)] : top

  const q = query.trim().toLowerCase()
  const order: Record<Sort, (a: SwapPickerPlayer, b: SwapPickerPlayer) => number> = {
    wait: (a, b) => b.restMinutes - a.restMinutes || a.games - b.games,
    games: (a, b) => a.games - b.games || b.restMinutes - a.restMinutes,
    name: (a, b) => a.name.localeCompare(b.name),
  }
  const rest = players
    .filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q)) &&
        (band === 'all' || (p.level !== null && p.level.startsWith(band))),
    )
    .sort(
      (a, b) =>
        Number(b.status === 'free') - Number(a.status === 'free') ||
        (flip ? -order[sort](a, b) : order[sort](a, b)),
    )
  const pages = Math.max(1, Math.ceil(rest.length / PAGE))
  const current = Math.min(page, pages)
  const shown = rest.slice((current - 1) * PAGE, current * PAGE)

  const expanded = all && wide
  const stacked = all && !wide
  const pickSort = (key: Sort) => {
    if (key === sort) setFlip((was) => !was)
    else {
      setSort(key)
      setFlip(false)
    }
    setPage(1)
  }

  const allPlayers = (
    <div className="flex min-w-0 flex-col gap-2">
      <TextInput
        type="search"
        aria-label="Search players"
        placeholder="Search players by name"
        className="min-h-11 w-full max-w-none"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setPage(1)
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Skill level"
          value={band}
          onChange={(value) => {
            setBand(value as Band)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All levels' },
            ...(['beginner', 'intermediate', 'advanced'] as const).map((key) => ({
              value: key,
              label: (
                <>
                  <i aria-hidden className={cn('size-2 rounded-full', BAND_DOT[key])} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </>
              ),
            })),
          ]}
        />
        {/* Tapping the selected sort again reverses it, so this is a plain button group */}
        {/* biome-ignore lint/a11y/useSemanticElements: a group of toggle buttons, as the prototype's .seg */}
        <div
          role="group"
          aria-label="Sort players. Tap the selected sort again to reverse it"
          className="inline-flex flex-wrap gap-[3px] self-start rounded-lg border border-border-strong p-[3px]"
        >
          {SORTS.map(({ key, label, reversed }) => {
            const on = sort === key
            const up = (key === 'wait') === (on && flip)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                title={on ? 'Tap again to reverse' : undefined}
                onClick={() => pickSort(key)}
                className={cn(
                  'inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-[7px] border-0 bg-transparent px-3.5 font-semibold text-fg2 touch:min-h-11',
                  on && 'bg-elev text-fg',
                )}
              >
                {on && flip ? reversed : label}
                {on ? (
                  <span aria-hidden className="text-accent">
                    {up ? '↑' : '↓'}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
      {shown.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
          {shown.map((p) => (
            <Tile
              key={p.id}
              player={p}
              minimumGames={minimumGames}
              pressed={p.id === inId}
              disabled={p.status !== 'free' || isPending}
              className="bg-surface"
              onClick={() => {
                onPickIn(p.id)
                if (stacked) setAll(false)
              }}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 text-[13px] text-fg2">No player matches.</p>
      )}
      {pages > 1 ? (
        <Pager page={current} pageCount={pages} onPage={setPage} aria-label="Player pages" />
      ) : null}
    </div>
  )

  const other = (
    <button
      type="button"
      aria-expanded={all}
      onClick={() => setAll((was) => !was)}
      className={cn(
        playerTileVariants({ state: 'note' }),
        'justify-center gap-0.5 border-dashed bg-transparent px-1 pt-2.5 pb-2',
        all && 'border-accent',
      )}
    >
      <span
        aria-hidden
        className="mb-1 grid size-11 place-items-center rounded-full bg-accent-subtle text-2xl font-bold text-accent"
      >
        {expanded ? '−' : '+'}
      </span>
      <span className="text-[13px] font-bold">{expanded ? 'Hide' : 'Other'}</span>
      <span className="text-[11px] text-fg2">All players</span>
    </button>
  )

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next && !isPending) onBack()
        }}
        title={title}
        closeLabel={`Back to match ${matchNo}`}
        dismissible={!isPending}
        hideClose={isPending}
        headerClassName="absolute top-3 right-3 z-[3] p-0 [&>h2]:sr-only"
        bodyClassName="px-5 pt-5 pb-4"
        className={
          expanded
            ? 'w-[min(75vw,calc(100vw-24px))]'
            : 'min-[641px]:w-[min(620px,calc(100vw-24px))]'
        }
      >
        <div
          className={cn(
            'grid min-h-full items-stretch gap-5',
            expanded ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]' : 'grid-cols-1',
          )}
        >
          <div className="flex min-w-0 flex-col gap-3.5">
            <p aria-hidden className="m-0 mb-0.5 pr-10 text-xl leading-[1.2] font-extrabold">
              {title}
            </p>
            <Section label={outLabel}>
              <div className="grid grid-cols-4 gap-2">
                {inMatch.map((p) => (
                  <Tile
                    key={p.id}
                    player={p}
                    minimumGames={minimumGames}
                    note={`Team ${p.team}`}
                    pressed={p.id === outId}
                    disabled={isPending}
                    onClick={() => onPickOut(p.id)}
                  />
                ))}
              </div>
            </Section>
            <Section label="Suggested">
              {free.length ? (
                <div className="grid grid-cols-4 gap-2">
                  {suggested.map((p) => (
                    <Tile
                      key={p.id}
                      player={p}
                      minimumGames={minimumGames}
                      pressed={p.id === inId}
                      disabled={isPending}
                      onClick={() => onPickIn(p.id)}
                    />
                  ))}
                  {other}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">{other}</div>
                  <p className="m-0 text-[13px] text-fg2">No present player is free right now.</p>
                </>
              )}
            </Section>
            {extra}
            {message ? <Notice tone="warn">{message}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            <div className="mt-1 flex flex-wrap gap-2.5 [&>*]:flex-auto">{action}</div>
          </div>
          {expanded ? (
            <div className="-mt-5 -mr-5 -mb-4 flex min-w-0 flex-col gap-2 rounded-r-[15px] border-l border-border-strong bg-bg p-5 pb-4">
              <h3 className="m-0 pr-10 text-sm font-bold">All players</h3>
              {allPlayers}
            </div>
          ) : null}
        </div>
      </Sheet>
      {stacked ? (
        <Sheet
          open
          onOpenChange={(next) => {
            if (!next) setAll(false)
          }}
          title="All players"
          closeLabel="Back to the suggestions"
          className="bg-bg"
        >
          {allPlayers}
        </Sheet>
      ) : null}
    </>
  )
}
