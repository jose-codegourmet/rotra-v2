'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { MatchFormat, MatchLineup } from '@rotra/data/match/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { type PlayerPickerCandidate, PlayerPickerSheet } from '@rotra/ui/player-picker-sheet'
import { Sheet } from '@rotra/ui/sheet'
import { SwapSidesArea, type SwapSlot } from '@rotra/ui/swap-sides-area'
import { SwappablePlayer } from '@rotra/ui/swap-sides-area/swappable-player'
import { useId, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import {
  type EnabledFormats,
  matchLineupFormDefaultValues,
  offeredFormats,
  sizeSlots,
} from './MatchLineupForm.defaultValues'
import {
  DUPLICATE_PLAYER_ERROR,
  FILL_SLOTS_ERROR,
  isFunFormat,
  MATCH_FORMAT_LABELS,
  MATCH_FORMAT_TEAM_SIZES,
  type MatchLineupFormInput,
  type MatchLineupFormValues,
  matchLineupSchema,
  type SlotValues,
} from './MatchLineupForm.schema'

export type MatchLineupFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Add match" (primary "Add to queue") or "Edit lineup" (primary "Save lineup") */
  mode: 'add' | 'edit'
  /** The session's standard formats; a format that is off never appears */
  enabledFormats: EnabledFormats
  /**
   * The roster as the picker shows it, in picker order (queue rules). Filled slots read the player's
   * name, level, games and status from here.
   */
  players: PlayerPickerCandidate[]
  /** The session's minimum games, for "LEVEL · g/min" */
  minimumGames: number
  /** The match being edited; also pre-fills "Edit then add" from a suggestion */
  lineup?: MatchLineup
  onSubmit: (values: MatchLineupFormValues) => void
  /** The add or save is running: submit is disabled so one tap cannot save twice */
  isPending?: boolean
  /** Why the add or save failed; the lineup stays as it was */
  serverError?: string
  onCancel?: () => void
  /** A slot opened the picker ("+ Choose player" or "Change") */
  onPickSlot?: (team: 'A' | 'B', index: number) => void
  defaultValues?: Partial<MatchLineupFormInput>
}

type Team = 'A' | 'B'
type Picking = { team: Team; index: number }

const FIELD: Record<Team, 'teamA' | 'teamB'> = { A: 'teamA', B: 'teamB' }
const FUN_HINT =
  'Counts toward session games and the minimum; excluded from long-term player performance.'

/**
 * Q-MANUAL: the Add match / Edit lineup sheet. Format buttons (enabled standard formats, then the
 * fun formats), Team A / Team B slot columns sized by the format, and the slot picker
 * (PlayerPickerSheet) opened from any slot. The slots sit in a SwapSidesArea: dragging a player onto
 * a slot on the other team (an empty one too), or left / right arrow on a filled slot, switches sides.
 * The container owns the add / save mutation and its toasts.
 */
export function MatchLineupForm({
  open,
  onOpenChange,
  mode,
  enabledFormats,
  players,
  minimumGames,
  lineup,
  onSubmit,
  isPending = false,
  serverError,
  onCancel,
  onPickSlot,
  defaultValues,
}: MatchLineupFormProps) {
  const formId = useId()
  const errorId = `${formId}-slots-error`
  const form = useForm<MatchLineupFormInput, unknown, MatchLineupFormValues>({
    resolver: zodResolver(matchLineupSchema),
    defaultValues: { ...matchLineupFormDefaultValues(enabledFormats, lineup), ...defaultValues },
  })
  const [picking, setPicking] = useState<Picking | null>(null)
  const { errors } = form.formState
  const [format, teamA, teamB] = form.watch(['format', 'teamA', 'teamB'])
  const slotsError = errors.teamA?.message
  const playerById = new Map(players.map((p) => [p.id, p]))

  // Which slots to outline in error: every empty one for "Fill every slot", the repeated players
  // for "Each player can only take one slot" (the prototype's .slot-btn.bad).
  const placed = [...teamA, ...teamB].filter((id): id is string => !!id)
  const duplicates = placed.filter((id, i) => placed.indexOf(id) !== i)
  const isBad = (id: string | null) =>
    slotsError === FILL_SLOTS_ERROR
      ? !id
      : slotsError === DUPLICATE_PLAYER_ERROR && !!id && duplicates.includes(id)

  const setSlots = (team: Team, slots: SlotValues) => {
    form.setValue(FIELD[team], slots, { shouldDirty: true })
    form.clearErrors('teamA')
  }

  const changeFormat = (next: MatchFormat) => {
    const [sizeA, sizeB] = MATCH_FORMAT_TEAM_SIZES[next]
    form.setValue('format', next, { shouldDirty: true })
    setSlots('A', sizeSlots(form.getValues('teamA'), sizeA))
    setSlots('B', sizeSlots(form.getValues('teamB'), sizeB))
  }

  const setSlot = (team: Team, index: number, id: string | null) => {
    const slots = [...form.getValues(FIELD[team])]
    slots[index] = id
    setSlots(team, slots)
  }

  // Switch sides (SwapSidesArea reports the two slots): the players exchange places; an empty
  // target slot just takes the player. The change lives in the form until Save lineup.
  const swapSides = (from: SwapSlot, to: SwapSlot) => {
    const source = [...form.getValues(FIELD[from.team])]
    const target = [...form.getValues(FIELD[to.team])]
    const moved = source[from.index] ?? null
    source[from.index] = target[to.index] ?? null
    target[to.index] = moved
    setSlots(from.team, source)
    setSlots(to.team, target)
  }

  const openPicker = (team: Team, index: number) => {
    setPicking({ team, index })
    onPickSlot?.(team, index)
  }

  const slotLabel = (team: Team, index: number) => `Team ${team} player ${index + 1}`

  const renderSlot = (team: Team, index: number, slots: SlotValues) => {
    const id = slots[index] ?? null
    const player = id ? playerById.get(id) : undefined
    const label = slotLabel(team, index)
    const bad = isBad(id)
    if (!player) {
      return (
        <SwappablePlayer key={index} team={team} index={index} empty className="items-center">
          <button
            type="button"
            aria-label={`Choose ${label}`}
            aria-describedby={bad ? errorId : undefined}
            onClick={() => openPicker(team, index)}
            className={cn(
              'flex min-h-14 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-md border border-dashed border-border-strong bg-bg px-2.5 py-2 text-fg2 font-semibold',
              'hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'touch:min-h-[60px]',
              bad && 'border-error',
            )}
          >
            + Choose player
          </button>
        </SwappablePlayer>
      )
    }
    const note = !player.present ? ' · not present' : player.playingOn ? ' · playing now' : ''
    return (
      <div key={index} className="flex items-center gap-1.5">
        <SwappablePlayer team={team} index={index} className="flex-1 items-center">
          <button
            type="button"
            aria-label={`${label}: ${player.name}. Change. Left or right arrow switches sides`}
            aria-describedby={bad ? errorId : undefined}
            onClick={() => openPicker(team, index)}
            className={cn(
              'flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-bg px-2.5 py-2 text-left text-fg',
              'hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'touch:min-h-[60px]',
              bad && 'border-error',
            )}
          >
            <Avatar name={player.name} src={player.photoUrl} size={36} />
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="truncate">{player.name}</b>
              <span className="text-[13px] text-fg2">
                {levelLabel(player.level)} · {player.games}/{minimumGames}
                {note}
              </span>
            </span>
            <span className="text-[13px] text-fg2">Change</span>
          </button>
        </SwappablePlayer>
        <IconButton
          variant="ghost"
          size="xs"
          label={`Clear ${label}`}
          onClick={() => setSlot(team, index, null)}
        >
          <Icon name="x" />
        </IconButton>
      </div>
    )
  }

  const renderColumn = (team: Team, slots: SlotValues) => (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border-strong p-3">
      <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">Team {team}</span>
      {slots.map((_, index) => renderSlot(team, index, slots))}
    </div>
  )

  const edit = mode === 'edit'
  const current = picking ? (form.getValues(FIELD[picking.team])[picking.index] ?? null) : null
  const taken = picking ? placed.filter((id) => id !== current) : []

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={edit ? 'Edit lineup' : 'Add match'}
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel ?? (() => onOpenChange(false))}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            {edit ? 'Save lineup' : 'Add to queue'}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3.5"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending) onSubmit(values)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg2">Format</span>
            <Controller
              control={form.control}
              name="format"
              render={({ field }) => (
                <fieldset
                  aria-label="Format"
                  className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
                >
                  {offeredFormats(enabledFormats).map((f) => (
                    <Button
                      key={f}
                      size="xs"
                      aria-pressed={field.value === f}
                      onClick={() => changeFormat(f)}
                    >
                      {MATCH_FORMAT_LABELS[f]}
                    </Button>
                  ))}
                </fieldset>
              )}
            />
            {isFunFormat(format) ? (
              <span className="text-xs font-normal text-fg2">
                {FUN_HINT}
                {format === 'fun_5v5' ? ' 5v5 occupies two courts.' : ''}
              </span>
            ) : null}
          </div>
          <SwapSidesArea onSwap={swapSides} allowEmptyTargets>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
              <Controller
                control={form.control}
                name="teamA"
                render={({ field }) => renderColumn('A', field.value)}
              />
              <Controller
                control={form.control}
                name="teamB"
                render={({ field }) => renderColumn('B', field.value)}
              />
            </div>
          </SwapSidesArea>
          <span
            id={errorId}
            aria-live="polite"
            className={cn('text-[13px] font-semibold text-error', !slotsError && 'hidden')}
          >
            {slotsError}
          </span>
          <p className="m-0 text-[13px] text-fg2">
            Drag a player onto a slot on the other team to switch sides. A player who's playing now
            can go into a later match. That match can't start until they're free. Saving doesn't
            take a court.
          </p>
        </form>
      </FormProvider>
      {picking ? (
        <PlayerPickerSheet
          open
          onOpenChange={(next) => {
            if (!next) setPicking(null)
          }}
          team={picking.team}
          slotIndex={picking.index}
          players={players}
          minimumGames={minimumGames}
          currentId={current}
          takenIds={taken}
          onChoose={(id) => {
            setSlot(picking.team, picking.index, id)
            setPicking(null)
          }}
          onBack={() => setPicking(null)}
        />
      ) : null}
    </Sheet>
  )
}
