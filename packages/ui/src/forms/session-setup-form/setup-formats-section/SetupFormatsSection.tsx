'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { MODE_OPTIONS } from '../SessionSetupForm.helpers'
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
  allowedRequestFormats?: MatchFormat[]
  onRequestFormatsChange?: (formats: MatchFormat[]) => void
}

/** Page 2 › Formats and mode: the Singles / Doubles switches and the Chill / Fair / Hard cards. */
export function SetupFormatsSection({
  allowedRequestFormats,
  onRequestFormatsChange,
}: SetupFormatsSectionProps = {}) {
  const form = useFormContext<SessionSetupInput>()
  const singles = useWatch({ control: form.control, name: 'allowSingles' })
  const doubles = useWatch({ control: form.control, name: 'allowDoubles' })
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
              }))}
            />
          )}
        />
        <span className="text-xs text-fg2">
          An easy game means that player's team is favored to win. Modes are flexible pairing
          presets. You can always change a match yourself.
        </span>
      </div>
    </>
  )
}
