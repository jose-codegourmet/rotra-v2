'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '@rotra/ui/card'
import { Field, RequiredPill } from '@rotra/ui/field'
import { GenderChips } from '@rotra/ui/gender-chips'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { OnboardingFrame } from '@rotra/ui/onboarding-frame'
import { OptionalFold } from '@rotra/ui/optional-fold'
import { PersonalDetailsFields } from '@rotra/ui/personal-details-fields'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { yourDetailsDefaultValues } from './YourDetailsForm.defaultValues'
import { type YourDetailsValues, yourDetailsSchema } from './YourDetailsForm.schema'

export type YourDetailsFormProps = {
  defaultValues?: YourDetailsValues
  /** The Google email or the sign-in email, read-only */
  signInWith: string
  /** The masked phone on file, read-only */
  maskedPhone: string
  /** Cancel: back to the question without saving */
  onCancel: () => void
  onSubmit: (values: YourDetailsValues) => void
  isPending?: boolean
  serverError?: string
}

const OPTIONAL_KEYS = [
  'nickname',
  'experienceYears',
  'experienceMonths',
  'facebook',
  'instagram',
  'youtube',
  'linkedin',
] as const

/**
 * P-ONBOARD › Back on the first question reopens Your details (owner artifact comment, November 19,
 * 2026: "I cant go back to initial form"). The account already exists, so Full name, Gender and the
 * Optional fold show prefilled, the sign-in method and phone are read-only, Cancel returns and
 * Continue saves and returns ("Details saved").
 */
export function YourDetailsForm({
  defaultValues = yourDetailsDefaultValues,
  signInWith,
  maskedPhone,
  onCancel,
  onSubmit,
  isPending = false,
  serverError,
}: YourDetailsFormProps) {
  const form = useForm<YourDetailsValues>({
    resolver: zodResolver(yourDetailsSchema),
    defaultValues,
  })
  const formId = useId()
  const errors = form.formState.errors
  const submitOnce = useSubmitOnce(isPending)
  return (
    <OnboardingFrame
      step={1}
      stepName="Your details"
      onBack={onCancel}
      backLabel="Cancel"
      primaryLabel="Continue"
      primaryFormId={formId}
      primaryPending={isPending}
    >
      <div className="flex flex-col gap-1.5">
        <h1>Your details</h1>
        <p className="m-0 text-fg2">Your account is set up. Change anything here, then continue.</p>
      </div>
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => submitOnce(() => onSubmit(values)))}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <Card asChild>
            <section className="flex flex-col gap-4" aria-labelledby={`${formId}-needed`}>
              <h2 id={`${formId}-needed`} className="text-[15px] font-semibold">
                Needed to continue
              </h2>
              <Field
                label={
                  <>
                    Full name <RequiredPill /> · <span className="text-xs font-normal">public</span>
                  </>
                }
                hint={
                  errors.fullName
                    ? undefined
                    : 'Shows to signed-in ROTRA players on sessions you join.'
                }
                error={errors.fullName?.message}
              >
                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <TextInput {...field} autoComplete="name" disabled={isPending} />
                  )}
                />
              </Field>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <GenderChips
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.gender?.message}
                    hint="Clubs use it to name your matches: Men's, Women's or Mixed Doubles."
                    disabled={isPending}
                  />
                )}
              />
              <KeyValueList
                items={[
                  { label: 'Signs in with', value: signInWith },
                  { label: 'Phone', value: <span className="font-mono">{maskedPhone}</span> },
                ]}
              />
              <span className="text-xs text-fg2">
                To change your sign-in email or phone later, use Privacy and contact.
              </span>
            </section>
          </Card>
          <OptionalFold
            hasError={OPTIONAL_KEYS.some((key) => errors[key])}
            summary="Nickname, experience and links"
          >
            <PersonalDetailsFields
              sections={['nickname', 'playing-style', 'links']}
              disabled={isPending}
            />
          </OptionalFold>
        </form>
      </FormProvider>
    </OnboardingFrame>
  )
}
