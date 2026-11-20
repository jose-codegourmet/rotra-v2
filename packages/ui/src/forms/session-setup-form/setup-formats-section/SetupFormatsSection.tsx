'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { SCORING, scoringOf } from '@rotra/schema/scoring'
import { Chip } from '@rotra/ui/chip'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  deuceHint,
  MODE_OPTIONS,
  pointsOf,
  recordGamesHint,
  SCORING_HINT,
  SCORING_LOCKED_HINT,
  SCORING_POINTS,
  type SetupCardArt,
  scoringKeyFor,
} from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

const FORMATS = [
  ['allowSingles', 'Singles', 'Include standard singles when generating matches.'],
  ['allowDoubles', 'Doubles', 'Include standard doubles when generating matches.'],
] as const

const REQUEST_FORMATS: { value: MatchFormat; label: string }[] = [
  { value: 'doubles', label: '2 v 2' },
  { value: 'singles', label: '1 v 1' },
  { value: 'fun_1v2', label: '1 v 2' },
  { value: 'fun_3v3', label: '3 v 3' },
  { value: 'fun_4v4', label: '4 v 4' },
  { value: 'fun_5v5', label: '5 v 5' },
]
export type SetupFormatsSectionProps = {
  /** The session has started: Record games is a read-only On / Off chip, not a switch */
  recordGamesLocked?: boolean
  /** The session has started: Scoring is read-only with "Scoring can't change after Start." */
  scoringLocked?: boolean
  /** Illustration URLs for the Mode and Scoring cards (the app serves them); a card without one shows no art */
  cardArt?: SetupCardArt
  allowedRequestFormats?: MatchFormat[]
  onRequestFormatsChange?: (formats: MatchFormat[]) => void
}

/**
 * Scoring: pick the game points first (31 points, 21 points, 21 × 3), then Deuce on or off, with a
 * summary line. The picks map to the five scoring keys the form stores. Read-only once started.
 */
function ScoringField({ locked, cardArt }: { locked: boolean; cardArt?: SetupCardArt }) {
  const form = useFormContext<SessionSetupInput>()
  const key = scoringOf(useWatch({ control: form.control, name: 'scoring' }))
  const points = pointsOf(key)
  const mode = SCORING[key]
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-fg2">Scoring</span>
      {locked ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border-strong bg-bg px-3.5 py-3">
          <b className="font-bold">{mode.label}</b>
          <span className="text-[13px] text-fg2">{mode.text}</span>
        </div>
      ) : (
        <>
          <ChoiceGroup
            type="single"
            aria-label="Game points"
            value={points.k}
            onChange={(value) => {
              const next = SCORING_POINTS.find((p) => p.k === value)
              // Deuce stays as it is when the new card has both modes.
              if (next)
                form.setValue('scoring', scoringKeyFor(next, mode.deuce), { shouldDirty: true })
            }}
            choices={SCORING_POINTS.map((p) => ({
              value: p.k,
              title: p.label,
              description: p.text,
              art: cardArt?.[p.k],
            }))}
          />
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border-strong bg-bg px-3.5 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <b className="font-bold">Deuce</b>
              <span className="text-[13px] text-fg2">{deuceHint(key)}</span>
            </div>
            <Switch
              checked={mode.deuce}
              disabled={!points.off}
              aria-label="Deuce"
              onChange={(on) =>
                form.setValue('scoring', scoringKeyFor(points, on), { shouldDirty: true })
              }
            />
          </div>
          <div className="flex items-start gap-2 text-[13px] text-fg2">
            <Icon name="check" size={16} className="mt-px flex-none text-accent" />
            <span>
              <b>{mode.label}</b> · {mode.text}
            </span>
          </div>
        </>
      )}
      <span className="text-xs text-fg2">{locked ? SCORING_LOCKED_HINT : SCORING_HINT}</span>
    </div>
  )
}

/**
 * Page 2 › Formats and mode: the Singles / Doubles switches, the Chill / Fair / Hard cards, the Scoring
 * picker and the Record games switch (a read-only On / Off chip once the session has started).
 */
export function SetupFormatsSection({
  recordGamesLocked = false,
  scoringLocked = false,
  cardArt,
  allowedRequestFormats,
  onRequestFormatsChange,
}: SetupFormatsSectionProps = {}) {
  const form = useFormContext<SessionSetupInput>()
  const singles = useWatch({ control: form.control, name: 'allowSingles' })
  const doubles = useWatch({ control: form.control, name: 'allowDoubles' })
  // A value that is missing (a session saved before Record games) reads as on.
  const recordGames = useWatch({ control: form.control, name: 'recordGames' }) !== false
  return (
    <>
      {FORMATS.map(([name, label, text]) => (
        <div key={name} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3>{label}</h3>
            <p className="m-0 text-[13px] text-fg2">{text}</p>
          </div>
          <Controller
            control={form.control}
            name={name}
            render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} aria-label={label} />
            )}
          />
        </div>
      ))}
      {!singles && !doubles ? (
        <Notice tone="warn">
          With both formats off, Generate matches has nothing to make. Only manual fun games would
          be possible.
        </Notice>
      ) : null}
      {allowedRequestFormats ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg2">Players can request</span>
          {/* biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout */}
          <div
            role="group"
            aria-label="Formats players can request"
            className="inline-flex flex-wrap gap-[3px] self-start rounded-lg border border-border-strong p-[3px]"
          >
            {REQUEST_FORMATS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={allowedRequestFormats.includes(value)}
                onClick={() =>
                  onRequestFormatsChange?.(
                    allowedRequestFormats.includes(value)
                      ? allowedRequestFormats.filter((format) => format !== value)
                      : [...allowedRequestFormats, value],
                  )
                }
                className={cn(
                  'inline-flex min-h-9 items-center rounded-[7px] border-0 bg-transparent px-3.5 font-semibold text-fg2 touch:min-h-11 touch:px-4',
                  'aria-pressed:bg-elev aria-pressed:text-fg',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-fg2">
            Which kinds of games a signed-in player can ask for with Request a match. Greyed pills
            on their side are the ones you leave off here.
            {allowedRequestFormats.length === 0
              ? " With none on, players can't send match requests."
              : ''}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Mode</span>
        <Controller
          control={form.control}
          name="sessionMode"
          render={({ field }) => (
            <ChoiceGroup
              type="single"
              aria-label="Session mode"
              value={field.value}
              onChange={(value) => field.onChange(value as SessionSetupInput['sessionMode'])}
              choices={MODE_OPTIONS.map((m) => ({
                value: m.value,
                title: m.label,
                description: m.text,
                art: cardArt?.[m.value],
              }))}
            />
          )}
        />
        <span className="text-xs text-fg2">
          An easy game means that player's team is favored to win. Modes are flexible pairing
          presets. You can always change a match yourself.
        </span>
      </div>
      <ScoringField locked={scoringLocked} cardArt={cardArt} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-fg2">Record games</span>
          {recordGamesLocked ? (
            <Chip>{recordGames ? 'On' : 'Off'}</Chip>
          ) : (
            <Controller
              control={form.control}
              name="recordGames"
              render={({ field }) => (
                <Switch
                  checked={field.value !== false}
                  onChange={field.onChange}
                  aria-label="Record games"
                />
              )}
            />
          )}
        </div>
        <span className="text-xs text-fg2">{recordGamesHint(recordGames, recordGamesLocked)}</span>
      </div>
    </>
  )
}
