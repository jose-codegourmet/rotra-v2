'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { LinkPage } from '@rotra/ui/account-link-status/link-page'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Field } from '@rotra/ui/field'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { Notice } from '@rotra/ui/notice'
import { PersonalDetailsFields } from '@rotra/ui/personal-details-fields'
import { PhoneOrEmailInput } from '@rotra/ui/phone-or-email-input'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { claimDefaultValues } from './ClaimForm.defaultValues'
import { type ClaimValues, claimSchema } from './ClaimForm.schema'

export type ClaimFormProps = {
  clubName: string
  /** Shown read-only, exactly as received. Empty when the profile has no phone: the player types one. */
  maskedPhone: string
  defaultValues?: Partial<ClaimValues>
  onSubmit: (values: ClaimValues) => void
  isPending?: boolean
  /** An email or phone problem shows under that field; anything else as a notice at the top */
  serverError?: { message: string; field?: 'email' | 'phone' }
}
const sectionLabel = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'
function Required({ children }: { children: string }) {
  return (
    <>
      {children}{' '}
      <span className="text-error" aria-hidden="true">
        *
      </span>
    </>
  )
}
/** P-CLAIM step 2, Finish registering: private contact and password, then optional details. */
export function ClaimForm({
  clubName,
  maskedPhone,
  defaultValues,
  onSubmit,
  isPending = false,
  serverError,
}: ClaimFormProps) {
  const [showPasswords, setShowPasswords] = useState(false)
  const form = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { ...claimDefaultValues, ...defaultValues },
  })
  const errors = form.formState.errors
  const needsPhone = !maskedPhone
  const submitOnce = useSubmitOnce(isPending)
  useEffect(() => {
    if (serverError?.field)
      form.setError(serverError.field, { type: 'server', message: serverError.message })
  }, [serverError, form])
  const passwordInput = (name: 'password' | 'confirmPassword') => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextInput
          {...field}
          type={showPasswords ? 'text' : 'password'}
          autoComplete="new-password"
          disabled={isPending}
        />
      )}
    />
  )
  return (
    <LinkPage
      label={`Registration link from ${clubName}`}
      title="Finish registering"
      description="Your club filled in what it knows. Check it, change anything that's wrong, and choose a password."
    >
      <FormProvider {...form}>
        <Card asChild>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => {
              if (needsPhone && !values.phone.trim()) {
                form.setError('phone', { type: 'required', message: 'Enter your mobile number.' })
                return
              }
              submitOnce(() => onSubmit(needsPhone ? values : { ...values, phone: '' }))
            })}
          >
            {serverError && !serverError.field ? (
              <Notice tone="error">{serverError.message}</Notice>
            ) : null}
            <div className="flex flex-col gap-3.5">
              <span className={sectionLabel}>Contact · private</span>
              {needsPhone ? (
                <Field
                  label={<Required>Phone number</Required>}
                  hint={
                    errors.phone
                      ? undefined
                      : 'This profile has no phone yet. Add your mobile number; it identifies your ROTRA profile.'
                  }
                  error={errors.phone?.message}
                >
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneOrEmailInput
                        {...field}
                        mode="phone"
                        autoComplete="tel"
                        placeholder="0917 555 0142"
                        disabled={isPending}
                      />
                    )}
                  />
                </Field>
              ) : (
                <Field
                  label="Phone number"
                  hint="Linked to this profile and can't be changed here. Not your number? Ask the club or ROTRA for help."
                >
                  <TextInput value={maskedPhone} readOnly className="font-mono" />
                </Field>
              )}
              <Field
                label={<Required>Email</Required>}
                hint={errors.email ? undefined : 'Used for password resets. Never shown publicly.'}
                error={errors.email?.message}
              >
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      disabled={isPending}
                    />
                  )}
                />
              </Field>
              <Field label={<Required>Password</Required>} error={errors.password?.message}>
                <div className="flex items-center gap-2">
                  {passwordInput('password')}
                  <Button
                    size="sm"
                    className="shrink-0"
                    aria-pressed={showPasswords}
                    aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    onClick={() => setShowPasswords((show) => !show)}
                  >
                    {showPasswords ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </Field>
              <Field
                label={<Required>Confirm password</Required>}
                error={errors.confirmPassword?.message}
              >
                {passwordInput('confirmPassword')}
              </Field>
            </div>
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              <span className={sectionLabel}>About you</span>
              <PersonalDetailsFields
                sections={['name', 'playing-style', 'links']}
                disabled={isPending}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? 'Completing…' : 'Complete registration'}
              </Button>
            </div>
          </form>
        </Card>
      </FormProvider>
    </LinkPage>
  )
}
