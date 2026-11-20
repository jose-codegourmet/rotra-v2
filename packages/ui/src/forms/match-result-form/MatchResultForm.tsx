'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { type ScoringKey, scoringMode } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useId, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { listNames, matchResultFormDefaultValues } from './MatchResultForm.defaultValues'
import {
  gamesState,
  type MatchResultFormInput,
  type MatchResultFormValues,
  matchResultSchemaFor,
  scoreTyped,
  type Team,
} from './MatchResultForm.schema'

export type MatchResultFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The match's number: "Match N result" */
  matchNo: number
  /** Team A's short names in lineup order */
  teamANames: string[]
  /** Team B's short names in lineup order */
  teamBNames: string[]
  /** The session's scoring mode; decides what the sheet asks for. Defaults to 16/31 */
  scoring?: ScoringKey
  /** Review result passed validation: the container opens Confirm match result with these values */
  onSubmit: (values: MatchResultFormValues) => void
  /** The review or confirmation is running: Review result cannot fire twice */
  isPending?: boolean
  /** Why the result could not be taken further; what was typed stays in the fields */
  serverError?: string
  /** Back to the active match; defaults to closing */
  onBack?: () => void
  defaultValues?: Partial<MatchResultFormInput>
}

const LABEL_CLASS = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'
const SCORE_BOX_CLASS = 'text-center text-[22px] font-bold tabular-nums'
const TEAMS: Team[] = ['A', 'B']
type BoxName =
  | 'lose'
  | 'scoreA'
  | 'scoreB'
  | `games.${0 | 1 | 2}.lose`
  | `games.${0 | 1 | 2}.a`
  | `games.${0 | 1 | 2}.b`

/**
 * Q-MATCH-DONE: the "Match N result" sheet, following the session's scoring mode (Q22).
 *
 * One game (16/31, 16/31 no deuce, 11/21): Pick the winner is required; once picked, the winner's
 * side shows the fixed target and one box takes the losing score; in the deuce modes Went to deuce
 * turns it into two boxes. Best of 3 (11/21 × 3, 21 × 3): Pick the winner, OR Enter each game (Game 3
 * only after a split), each row a Team A / Team B pick, the fixed winning score and the losing box
 * (11/21 × 3: a Deuce toggle per row); the games won and the winner above the rows, the top pick
 * following the games. Review result validates and reports the result; the container then shows
 * ConfirmResultSheet (D-WINNER) and owns the useCompleteMatch mutation.
 */
export function MatchResultForm({
  open,
  onOpenChange,
  matchNo,
  teamANames,
  teamBNames,
  scoring = '31',
  onSubmit,
  isPending = false,
  serverError,
  onBack,
  defaultValues,
}: MatchResultFormProps) {
  const formId = useId()
  const messageId = `${formId}-result-message`
  const mode = scoringMode(scoring)
  const T = mode.target
  const best3 = mode.games === 3
  const schema = useMemo(() => matchResultSchemaFor(scoring), [scoring])
  const form = useForm<MatchResultFormInput, unknown, MatchResultFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...matchResultFormDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState
  const values = form.watch()
  const { winner, games } = values
  const st = gamesState(games)

  const rowErrors = errors.games
  const rowError = (i: number) => rowErrors?.[i]?.lose?.message
  const loseError = errors.lose?.message
  const error =
    errors.winner?.message ??
    loseError ??
    rowErrors?.root?.message ??
    rowErrors?.message ??
    [0, 1, 2].map(rowError).find(Boolean)

  const anyScore = best3
    ? st.visible.some((i) => games[i] && scoreTyped(games[i]))
    : scoreTyped({
        deuce: mode.deuce && values.deuce,
        lose: values.lose,
        a: values.scoreA,
        b: values.scoreB,
      })

  const teamNames: Record<Team, string> = {
    A: listNames(teamANames),
    B: listNames(teamBNames),
  }
  const clear = () => form.clearErrors()
  const blank = { shouldDirty: true } as const

  const clearScores = () => {
    for (const name of ['lose', 'scoreA', 'scoreB'] as const) form.setValue(name, '', blank)
    for (const i of [0, 1, 2] as const)
      for (const k of ['lose', 'a', 'b'] as const) form.setValue(`games.${i}.${k}`, '', blank)
    clear()
  }

  /** Went to deuce (one game) or a row's Deuce: flip it and empty that game's boxes */
  const setDeuce = (on: boolean, row?: 0 | 1 | 2) => {
    if (row === undefined) {
      form.setValue('deuce', on, blank)
      for (const name of ['lose', 'scoreA', 'scoreB'] as const) form.setValue(name, '', blank)
    } else {
      form.setValue(`games.${row}.deuce`, on, blank)
      for (const k of ['lose', 'a', 'b'] as const) form.setValue(`games.${row}.${k}`, '', blank)
    }
    clear()
  }

  /** A row's Team A / Team B pick; once one pair has won 2 games the top pick follows */
  const setGameWinner = (row: 0 | 1 | 2, team: Team) => {
    form.setValue(`games.${row}.winner`, team, blank)
    const decided = gamesState(form.getValues('games')).decided
    if (decided) form.setValue('winner', decided, blank)
    clear()
  }

  const box = (name: BoxName, label: string, ariaLabel: string, invalid: boolean) => (
    <Field label={label}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <TextInput
            {...field}
            value={field.value as string}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            aria-label={ariaLabel}
            invalid={invalid}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={messageId}
            className={SCORE_BOX_CLASS}
            onChange={(event) => {
              field.onChange(event)
              clear()
            }}
          />
        )}
      />
    </Field>
  )

  const fixed = (team: Team, label: string, gameLabel: string) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-fg2">{label}</span>
      <div
        role="img"
        aria-label={`${gameLabel}Team ${team} score, ${T}`}
        className="flex min-h-11 items-center justify-center rounded-md border border-accent bg-accent-subtle px-3 py-2 font-mono text-[22px] font-bold text-fg tabular-nums"
      >
        {T}
      </div>
    </div>
  )

  /**
   * The score cells for one game (the prototype's scoreEntry): the winner's side shows the target,
   * the other side the losing-score box; with deuce on, two boxes. `row` is a best-of-3 game.
   */
  const scoreEntry = (gameWinner: Team, deuce: boolean, row?: 0 | 1 | 2) => {
    const short = row !== undefined
    const gameLabel = short ? `Game ${row + 1}, ` : ''
    const invalid = short ? Boolean(rowError(row)) : Boolean(loseError)
    const lab = (t: Team) => (short ? `Team ${t}` : `Team ${t} · ${teamNames[t]}`)
    let cellA: ReactNode
    let cellB: ReactNode
    if (deuce) {
      cellA = box(
        short ? `games.${row}.a` : 'scoreA',
        lab('A'),
        `${gameLabel}Team A score`,
        invalid,
      )
      cellB = box(
        short ? `games.${row}.b` : 'scoreB',
        lab('B'),
        `${gameLabel}Team B score`,
        invalid,
      )
    } else {
      const loser: Team = gameWinner === 'A' ? 'B' : 'A'
      const lose = box(
        short ? `games.${row}.lose` : 'lose',
        short ? `Team ${loser} scored` : `${teamNames[loser]} scored (optional)`,
        `${gameLabel}${teamNames[loser]} scored`,
        invalid,
      )
      cellA = gameWinner === 'A' ? fixed('A', lab('A'), gameLabel) : lose
      cellB = gameWinner === 'A' ? lose : fixed('B', lab('B'), gameLabel)
    }
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
        {cellA}
        <span
          aria-hidden="true"
          className="pb-3 text-[11px] font-extrabold tracking-[1px] text-fg3"
        >
          –
        </span>
        {cellB}
      </div>
    )
  }

  const message = (text: string) =>
    error ? (
      <span
        id={messageId}
        role="alert"
        className="min-w-0 flex-1 text-[13px] font-semibold text-error"
      >
        {error}
      </span>
    ) : (
      <span id={messageId} className="min-w-0 flex-1 text-xs font-normal text-fg2">
        {text}
      </span>
    )

  const foot = (hint: string) => (
    <div className="flex items-start justify-between gap-3">
      {message(hint)}
      {anyScore ? (
        <Button variant="ghost" size="xs" className="ml-auto flex-none" onClick={clearScores}>
          {best3 ? 'Clear scores' : 'Clear score'}
        </Button>
      ) : null}
    </div>
  )

  const pick = (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className={LABEL_CLASS}>Pick the winner</span>
      <Controller
        control={form.control}
        name="winner"
        render={({ field }) => (
          <ChoiceGroup
            type="single"
            aria-label="Pick the winner"
            value={field.value ?? ''}
            onChange={(value) => {
              field.onChange(value as Team)
              clear()
            }}
            choices={TEAMS.map((t) => ({ value: t, eyebrow: `Team ${t}`, title: teamNames[t] }))}
          />
        )}
      />
    </div>
  )

  let body: ReactNode
  if (!best3) {
    body = (
      <>
        {pick}
        {!winner ? (
          message('Pick the winner first. The score is optional.')
        ) : (
          <>
            {mode.deuce ? (
              <div className="flex items-center justify-between gap-3">
                <span>
                  <b>Went to deuce</b>
                  <br />
                  <span className="text-[13px] text-fg2">
                    {T - 1}–{T - 1} and on: the first to lead by 2 wins.
                  </span>
                </span>
                <Switch
                  aria-label="Went to deuce"
                  checked={values.deuce}
                  onChange={(on) => setDeuce(on)}
                />
              </div>
            ) : null}
            {scoreEntry(winner, mode.deuce && values.deuce)}
            {foot(
              mode.deuce && values.deuce
                ? `Deuce at ${T - 1}–${T - 1}: the first to lead by 2 wins. Type both scores.`
                : `Game to ${T}. Enter the losing score, or leave it empty.`,
            )}
          </>
        )}
      </>
    )
  } else {
    body = (
      <>
        {pick}
        <div
          aria-hidden="true"
          className="flex items-center gap-3 text-xs font-extrabold tracking-[2px] text-fg2 before:h-px before:flex-1 before:bg-border-strong after:h-px after:flex-1 after:bg-border-strong"
        >
          <span>OR</span>
        </div>
        <span className={LABEL_CLASS}>Enter each game</span>
        {st.played.length > 0 ? (
          <div
            aria-live="polite"
            className="flex flex-col gap-0.5 rounded-lg border border-accent bg-accent-subtle px-3 py-2.5"
          >
            <span>
              Games won · Team A{' '}
              <b className="tabular-nums">
                {st.wins.A} – {st.wins.B}
              </b>{' '}
              Team B
            </span>
            {st.decided ? (
              <span>
                Winner: <b>Team {st.decided}</b> · {teamNames[st.decided]}
              </span>
            ) : null}
          </div>
        ) : null}
        {st.visible.map((index) => {
          const i = index as 0 | 1 | 2
          const row = games[i]
          if (!row) return null
          return (
            // biome-ignore lint/a11y/useSemanticElements: the prototype's game-row is a named group, not a fieldset
            <div
              key={i}
              role="group"
              aria-label={`Game ${i + 1}`}
              className="flex flex-col gap-2.5 rounded-lg border border-border-strong bg-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <b>Game {i + 1}</b>
                {mode.deuce ? (
                  <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-fg2">
                    Deuce
                    <Switch
                      aria-label={`Game ${i + 1} went to deuce`}
                      checked={row.deuce}
                      onChange={(on) => setDeuce(on, i)}
                    />
                  </span>
                ) : null}
              </div>
              <SegmentedControl
                aria-label={`Game ${i + 1} winner`}
                value={row.winner ?? ''}
                onChange={(value) => setGameWinner(i, value as Team)}
                options={TEAMS.map((t) => ({ value: t, label: `Team ${t}` }))}
              />
              {row.winner ? scoreEntry(row.winner, mode.deuce && row.deuce, i) : null}
            </div>
          )
        })}
        {foot(`Best of 3 to ${T}. The first pair to win 2 games wins. Scores are optional.`)}
      </>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Match ${matchNo} result`}
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack ?? (() => onOpenChange(false))}>
            Back
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Review result
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3.5"
          onSubmit={form.handleSubmit((submitted) => {
            if (!isPending) onSubmit(submitted)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          {body}
        </form>
      </FormProvider>
    </Sheet>
  )
}
