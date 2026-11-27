'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { type ScoringKey, scoringMode } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useId, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { listNames, matchResultFormDefaultValues } from './MatchResultForm.defaultValues'
import {
  boxesForPick,
  gamesState,
  type MatchResultFormInput,
  type MatchResultFormValues,
  matchResultSchemaFor,
  scoreTyped,
  scoreWinner,
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
type Row = 0 | 1 | 2
type BoxName = 'scoreA' | 'scoreB' | `games.${Row}.a` | `games.${Row}.b`

/**
 * Q-MATCH-DONE: the "Match N result" sheet, following the session's scoring mode (Q22).
 *
 * Owner, November 25, 2026: two score boxes from the start, no deuce switch. Picking a team fills
 * its box with the target (green, still editable, e.g. 32 for deuce); typing the scores picks the
 * winner. One game (16/31, 16/31 no deuce, 11/21): a winner is required, the score optional. Best
 * of 3 (11/21 × 3, 21 × 3): Pick the winner, OR Enter each game (Game 3 only after a split), each
 * row a Team A / Team B pick and the same two boxes; the games won and the winner above the rows,
 * the top pick following the games. Review result validates and reports the result; the container then shows
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
  const rowError = (i: number) => rowErrors?.[i]?.a?.message
  const loseError = errors.scoreA?.message
  const error =
    errors.winner?.message ??
    loseError ??
    rowErrors?.root?.message ??
    rowErrors?.message ??
    [0, 1, 2].map(rowError).find(Boolean)

  // Clear score shows once both boxes of a game are filled (the prototype's gameEntered).
  const anyScore = best3
    ? st.visible.some((i) => games[i] && scoreTyped(games[i]))
    : scoreTyped({ a: values.scoreA, b: values.scoreB })

  const teamNames: Record<Team, string> = {
    A: listNames(teamANames),
    B: listNames(teamBNames),
  }
  const clear = () => form.clearErrors()
  const blank = { shouldDirty: true } as const

  const clearScores = () => {
    for (const name of ['scoreA', 'scoreB'] as const) form.setValue(name, '', blank)
    for (const i of [0, 1, 2] as const)
      for (const k of ['a', 'b'] as const) form.setValue(`games.${i}.${k}`, '', blank)
    clear()
  }

  /** Best of 3: once one pair has won 2 games the top pick follows */
  const followGames = () => {
    const decided = gamesState(form.getValues('games')).decided
    if (decided) form.setValue('winner', decided, blank)
  }

  /** A team picked (one game) or a row's Team A / Team B: fill its box with the target */
  const pickWinner = (team: Team, row?: Row) => {
    if (row === undefined) {
      form.setValue('winner', team, blank)
      if (!best3) {
        const next = boxesForPick(
          mode,
          { a: form.getValues('scoreA'), b: form.getValues('scoreB') },
          team,
        )
        form.setValue('scoreA', next.a, blank)
        form.setValue('scoreB', next.b, blank)
      }
    } else {
      const next = boxesForPick(mode, form.getValues(`games.${row}`), team)
      form.setValue(`games.${row}.winner`, team, blank)
      form.setValue(`games.${row}.a`, next.a, blank)
      form.setValue(`games.${row}.b`, next.b, blank)
      followGames()
    }
    clear()
  }

  /** Typing the scores picks the winner (the higher score, or one box alone at the target) */
  const followScores = (row?: Row) => {
    if (row === undefined) {
      const w = scoreWinner(mode, { a: form.getValues('scoreA'), b: form.getValues('scoreB') })
      if (w) form.setValue('winner', w, blank)
    } else {
      const w = scoreWinner(mode, form.getValues(`games.${row}`))
      if (w) {
        form.setValue(`games.${row}.winner`, w, blank)
        followGames()
      }
    }
  }

  const box = (
    name: BoxName,
    label: string,
    ariaLabel: string,
    invalid: boolean,
    won: boolean,
    row?: Row,
  ) => (
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
            placeholder={won ? String(T) : '0'}
            autoComplete="off"
            aria-label={ariaLabel}
            invalid={invalid}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={messageId}
            className={cn(SCORE_BOX_CLASS, won && !invalid && 'border-accent bg-accent-subtle')}
            onChange={(event) => {
              field.onChange(event)
              followScores(row)
              clear()
            }}
          />
        )}
      />
    </Field>
  )

  /**
   * The score cells for one game (the prototype's scoreEntry): two boxes, always typeable; the
   * winner's is green and starts at the target. `row` is a best-of-3 game.
   */
  const scoreEntry = (gameWinner: Team | null, row?: Row) => {
    const short = row !== undefined
    const gameLabel = short ? `Game ${row + 1}, ` : ''
    const invalid = short ? Boolean(rowError(row)) : Boolean(loseError)
    const lab = (t: Team) =>
      `${short ? `Team ${t}` : `Team ${t} · ${teamNames[t]}`}${gameWinner === t ? ' · won' : ''}`
    const cell = (t: Team) =>
      box(
        short ? `games.${row}.${t === 'A' ? 'a' : 'b'}` : t === 'A' ? 'scoreA' : 'scoreB',
        lab(t),
        `${gameLabel}Team ${t} score`,
        invalid,
        gameWinner === t,
        row,
      )
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
        {cell('A')}
        <span
          aria-hidden="true"
          className="pb-3 text-[11px] font-extrabold tracking-[1px] text-fg3"
        >
          –
        </span>
        {cell('B')}
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
            onChange={(value) => pickWinner(value as Team)}
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
        {scoreEntry(winner)}
        {foot(
          `Game to ${T}. Pick the winner or type the scores; the score is optional.${mode.deuce ? ` Past ${T - 1}–${T - 1}, change the green box too, like ${T + 1}–${T - 1}.` : ''}`,
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
              <b>Game {i + 1}</b>
              <SegmentedControl
                aria-label={`Game ${i + 1} winner`}
                value={row.winner ?? ''}
                onChange={(value) => pickWinner(value as Team, i)}
                options={TEAMS.map((t) => ({ value: t, label: `Team ${t}` }))}
              />
              {scoreEntry(row.winner, i)}
            </div>
          )
        })}
        {foot(
          `Best of 3 to ${T}. The first pair to win 2 games wins. Scores are optional.${mode.deuce ? ` Past ${T - 1}–${T - 1}, change the green box too.` : ''}`,
        )}
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
