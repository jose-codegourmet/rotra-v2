'use client'

import { ChoiceGroup } from '@rotra/ui/choice-group'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { MODE_OPTIONS } from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

const FORMATS = [
  ['allowSingles', 'Singles', 'Include standard singles when generating matches.'],
  ['allowDoubles', 'Doubles', 'Include standard doubles when generating matches.'],
] as const

/** Page 2 › Formats and mode: the Singles / Doubles switches and the Chill / Fair / Hard cards. */
export function SetupFormatsSection() {
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
          With both formats off, Auto queue has nothing to generate. Only manual fun games would be
          possible.
        </Notice>
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
