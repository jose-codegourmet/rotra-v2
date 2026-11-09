'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { REQUEST_FORMAT_ORDER, requestSpots } from '@rotra/data/match-request/rules'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { CourtDrawing } from '@rotra/ui/court-drawing'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'
import { courtFaceClass } from '../court-drawing/CourtDrawing.sizes'

/** A present player the request can name (the viewer is left out by the caller). */
export type MatchRequestSheetPlayer = {
  /** The SessionPlayer id: what `partners` and `opponents` hold */
  id: string
  name: string
  /** Nickname or first name, shown on the court face */
  shortName: string
  photoUrl?: string
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
}

export type MatchRequestSpotSide = 'partner' | 'opponent'
export type MatchRequestSpotRef = { side: MatchRequestSpotSide; index: number }

export type MatchRequestSheetProps = {
  open: boolean
  /** Escape, the scrim and the close button; the same as Cancel */
  onOpenChange: (open: boolean) => void
  /** The signed-in Player asking: the "You" face on the left */
  viewer: { name: string; photoUrl?: string }
  /** Present players other than the viewer; names the picked spots */
  players: MatchRequestSheetPlayer[]
  /** The session minimum, for "G/MIN" under a picked name */
  minimumGames: number
  /** Formats the session allows, in any order; empty means it takes no match requests */
  allowedFormats: readonly MatchFormat[]
  /** The selected format; the caller starts on the first allowed one (2 v 2 by default) */
  format: MatchFormat
  onFormatChange: (format: MatchFormat) => void
  /** One entry per partner spot the format needs; null is "Anyone" */
  partners: (string | null)[]
  /** One entry per opponent spot the format needs; null is "Anyone" */
  opponents: (string | null)[]
  /** A court spot or a picked row was tapped: the app opens the picker (PlayerPickerSheet) */
  onPickSpot: (spot: MatchRequestSpotRef) => void
  /** The × on a picked row: that spot goes back to Anyone */
  onClearSpot: (spot: MatchRequestSpotRef) => void
  onCancel: () => void
  /** Send request; with no format allowed the app toasts "This session isn't taking match requests" */
  onSend: () => void
  isPending?: boolean
  error?: ReactNode
}

/** The prototype's REQ_LABEL: the pill wording. */
const FORMAT_LABEL: Record<MatchFormat, string> = {
  doubles: '2 v 2',
  singles: '1 v 1',
  fun_1v2: '1 v 2',
  fun_3v3: '3 v 3',
  fun_4v4: '4 v 4',
  fun_5v5: '5 v 5',
}

const NOT_ALLOWED = 'Not allowed for requests in this session'

/** Players stack top to bottom; bigger sides wrap into more columns (the prototype's rows()). */
const rowsFor = (n: number) => (n <= 2 ? n : n <= 4 ? 2 : 3)

const spotLabel = (side: MatchRequestSpotSide, index: number, count: number) =>
  side === 'partner'
    ? count > 1
      ? `Partner ${index + 1}`
      : 'Partner'
    : count > 1
      ? `Opponent ${index + 1}`
      : 'Opponent'

type Spot = { side: MatchRequestSpotSide; index: number; label: string; playerId: string | null }

/**
 * Q-PUBLIC-DETAILS (My night › Request a match): a present Player asks the Queue Master for a match.
 * The request is drawn on the console's court: the viewer on the left with their partners, the
 * opponents on the right; an empty spot is a dashed "+" (Anyone). Controlled and presentational: the
 * app owns the picker, the toasts and the send.
 */
export function MatchRequestSheet({
  open,
  onOpenChange,
  viewer,
  players,
  minimumGames,
  allowedFormats,
  format,
  onFormatChange,
  partners,
  opponents,
  onPickSpot,
  onClearSpot,
  onCancel,
  onSend,
  isPending = false,
  error,
}: MatchRequestSheetProps) {
  const counts = requestSpots(format)
  const byId = new Map(players.map((p) => [p.id, p]))
  const spotsOf = (side: MatchRequestSpotSide, count: number, ids: (string | null)[]): Spot[] =>
    Array.from({ length: count }, (_, index) => ({
      side,
      index,
      label: spotLabel(side, index, count),
      playerId: ids[index] ?? null,
    }))
  const partnerSpots = spotsOf('partner', counts.partners, partners)
  const opponentSpots = spotsOf('opponent', counts.opponents, opponents)
  const picked = [...partnerSpots, ...opponentSpots].filter(
    (s) => s.playerId && byId.has(s.playerId),
  )

  const leftCount = 1 + partnerSpots.length
  const rightCount = opponentSpots.length
  const big = counts.partners + 1 + counts.opponents >= 8
  const someGreyed = REQUEST_FORMAT_ORDER.some((f) => !allowedFormats.includes(f))

  const face = (n: number, spot: Spot) => {
    const player = spot.playerId ? byId.get(spot.playerId) : undefined
    return (
      <button
        key={`${spot.side}-${spot.index}`}
        type="button"
        onClick={() => onPickSpot({ side: spot.side, index: spot.index })}
        aria-label={`${spot.label}: ${player ? player.name : 'Anyone'}. Change`}
        className={cn(
          'group/face m-0 flex min-w-0 flex-col items-center gap-px rounded-md border-0 bg-transparent p-0',
          courtFaceClass(n),
          n < 4 && '[&>:last-child]:!max-w-[clamp(72px,30cqw,140px)]',
          // The dashed "+" face and its dimmer label are the court overlay's fixed values.
          !player &&
            '[&>:first-child]:!text-[length:clamp(18px,6cqw,26px)] [&>:last-child]:bg-photo-label/75 [&>:last-child]:font-semibold [&>:last-child]:text-on-photo/90',
        )}
      >
        {player ? (
          <Avatar
            name={player.name}
            src={player.photoUrl}
            className="ring-2 ring-on-photo/90 group-hover/face:ring-accent group-focus-visible/face:ring-accent"
          />
        ) : (
          <Avatar
            name="Anyone"
            initials="+"
            className="bg-photo-label/50 font-medium text-on-photo outline-2 -outline-offset-2 outline-on-photo/85 outline-dashed group-hover/face:outline-accent group-focus-visible/face:outline-accent"
          />
        )}
        <span className="max-w-16 truncate rounded-full bg-photo-label px-[5px] text-[10px] leading-[1.3] font-bold text-on-photo">
          {player ? player.shortName : spot.label}
        </span>
      </button>
    )
  }

  const side = (n: number, children: ReactNode) => (
    <div
      style={{ gridTemplateRows: `repeat(${rowsFor(n)}, auto)` }}
      className="grid min-w-0 grid-flow-col content-center justify-center gap-x-2.5 gap-y-1.5 px-1.5 py-1"
    >
      {children}
    </div>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onCancel()
        else onOpenChange(next)
      }}
      title="Request a match"
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" loading={isPending} onClick={onSend}>
            Send request
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        Tap a spot to pick who you want to play with, or leave it as Anyone. The QM decides.
      </p>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Format</span>
        <SegmentedControl
          aria-label="Format"
          value={format}
          disabled={isPending}
          onChange={(value) => {
            const next = value as MatchFormat
            if (allowedFormats.includes(next)) onFormatChange(next)
          }}
          options={REQUEST_FORMAT_ORDER.map((f) => {
            const allowed = allowedFormats.includes(f)
            return {
              value: f,
              disabled: !allowed,
              label: (
                <span
                  title={allowed ? undefined : NOT_ALLOWED}
                  className={cn('min-w-9 text-center tabular-nums', !allowed && 'line-through')}
                >
                  {FORMAT_LABEL[f]}
                </span>
              ),
            }
          })}
        />
        {someGreyed ? (
          <span className="text-xs font-normal text-fg2">
            Greyed formats aren't open for requests in this session.
          </span>
        ) : null}
      </div>
      <div className="@container relative">
        <CourtDrawing className={big ? 'aspect-[134/96]' : 'aspect-[134/72]'} />
        <fieldset
          aria-label="Your match request"
          className="absolute inset-0 m-0 grid min-w-0 grid-cols-2 border-0 p-0"
        >
          {side(
            leftCount,
            <>
              <div
                role="img"
                aria-label={`You, ${viewer.name}`}
                className={cn(
                  'flex min-w-0 flex-col items-center gap-px',
                  courtFaceClass(Math.min(leftCount, 5)),
                  Math.min(leftCount, 5) < 4 && '[&>:last-child]:!max-w-[clamp(72px,30cqw,140px)]',
                )}
              >
                <Avatar
                  name={viewer.name}
                  src={viewer.photoUrl}
                  className="ring-2 ring-on-photo/90"
                />
                <span className="max-w-16 truncate rounded-full bg-accent px-[5px] text-[10px] leading-[1.3] font-bold text-on-accent">
                  You
                </span>
              </div>
              {partnerSpots.map((spot) => face(Math.min(leftCount, 5), spot))}
            </>,
          )}
          {side(
            rightCount,
            opponentSpots.map((spot) => face(Math.min(rightCount, 5), spot)),
          )}
        </fieldset>
      </div>
      {picked.length ? (
        <div className="flex flex-col gap-1.5">
          {picked.map((spot) => {
            const player = spot.playerId ? byId.get(spot.playerId) : undefined
            if (!player) return null
            return (
              <div key={`${spot.side}-${spot.index}`} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onPickSpot({ side: spot.side, index: spot.index })}
                  aria-label={`${spot.label}: ${player.name}. Change`}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 rounded-sm border border-border-strong bg-bg px-2.5 py-2 text-left hover:border-accent touch:min-h-[60px]"
                >
                  <Avatar name={player.name} src={player.photoUrl} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="truncate">{player.name}</b>
                    <span className="text-[13px] text-fg2">
                      {levelLabel(player.level)} · {player.games}/{minimumGames}
                    </span>
                  </span>
                  <span className="text-[13px] text-fg2">Change</span>
                </button>
                <IconButton
                  size="xs"
                  variant="ghost"
                  label={`Set ${spot.label} back to Anyone`}
                  onClick={() => onClearSpot({ side: spot.side, index: spot.index })}
                >
                  <Icon name="x" />
                </IconButton>
              </div>
            )
          })}
        </div>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
