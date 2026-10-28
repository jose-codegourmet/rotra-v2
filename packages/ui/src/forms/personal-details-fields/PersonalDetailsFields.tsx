'use client'
import { SOCIAL_PROVIDERS } from '@rotra/schema/social-link'
import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import { Textarea } from '@rotra/ui/textarea'
import { type ReactNode, useId } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import type { PersonalDetailsValues } from './PersonalDetailsFields.schema'

export type PersonalDetailsSection = 'name' | 'playing-style' | 'links'
export type PersonalDetailsFieldsProps = {
  /** Edit profile shows one section at a time; the claim form shows all three */
  sections: PersonalDetailsSection[]
  disabled?: boolean
}
function Public({ children }: { children: ReactNode }) {
  return (
    <>
      {children} · <span className="text-xs font-normal">public</span>
    </>
  )
}
const gridClass = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5'

/** The prototype's fieldsBasics, fieldsGame and fieldsLinks, wired to the parent form's context. */
export function PersonalDetailsFields({ sections, disabled = false }: PersonalDetailsFieldsProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<PersonalDetailsValues>()
  const linksId = useId()
  const text = (name: keyof PersonalDetailsValues, props: Parameters<typeof TextInput>[0] = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <TextInput {...field} {...props} disabled={disabled} />}
    />
  )
  const error = (name: keyof PersonalDetailsValues) => errors[name]?.message
  return (
    <div className="flex flex-col gap-4">
      {sections.includes('name') ? (
        <div className={gridClass}>
          <Field
            label={
              <Public>
                Full name{' '}
                <span className="text-error" aria-hidden="true">
                  *
                </span>
              </Public>
            }
            error={error('fullName')}
          >
            {text('fullName', { autoComplete: 'name' })}
          </Field>
          <Field
            label={<Public>Nickname</Public>}
            hint={error('nickname') ? undefined : 'Optional'}
            error={error('nickname')}
          >
            {text('nickname', { autoComplete: 'nickname' })}
          </Field>
        </div>
      ) : null}
      {sections.includes('playing-style') ? (
        <>
          <Field
            label={<Public>Playing style</Public>}
            hint={
              error('playingStyle') ? undefined : 'Optional. How you play, in a sentence or two.'
            }
            error={error('playingStyle')}
          >
            <Controller
              control={control}
              name="playingStyle"
              render={({ field }) => <Textarea {...field} maxLength={280} disabled={disabled} />}
            />
          </Field>
          <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[13px] font-semibold text-fg2">
              <Public>Experience</Public>
            </legend>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Years" error={error('experienceYears')}>
                {text('experienceYears', { inputMode: 'numeric', placeholder: '0' })}
              </Field>
              <Field label="Months" error={error('experienceMonths')}>
                {text('experienceMonths', { inputMode: 'numeric', placeholder: '0' })}
              </Field>
            </div>
            <span className="text-xs text-fg2">
              Optional. Clubs may use it for a first assessment; it doesn't add rank points.
            </span>
          </fieldset>
        </>
      ) : null}
      {sections.includes('links') ? (
        <fieldset aria-describedby={linksId} className="m-0 flex flex-col gap-3 border-0 p-0">
          {sections.length > 1 ? (
            <legend className="mb-2 text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              Links
            </legend>
          ) : null}
          <p id={linksId} className="text-xs text-fg2">
            Optional. Links describe you to others; you can't sign in with them. Whether links are
            public is still being decided.
          </p>
          <div className={gridClass}>
            {SOCIAL_PROVIDERS.map((provider) => (
              <Field key={provider.key} label={provider.label} error={error(provider.key)}>
                {text(provider.key, {
                  type: 'url',
                  inputMode: 'url',
                  placeholder: provider.example,
                  autoCapitalize: 'none',
                  spellCheck: false,
                })}
              </Field>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  )
}
