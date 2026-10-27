'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { clubLoginDefaultValues } from './ClubLoginForm.defaultValues'
import { CLUB_LOGIN_REQUIRED, type ClubLoginValues, clubLoginSchema } from './ClubLoginForm.schema'

export type ClubLoginFormProps = {
  onSubmit: (values: ClubLoginValues) => void
  /** Sign-in is running: the button reads "Signing in…" and cannot submit again */
  isPending?: boolean
  /** Why the last sign-in failed; what was typed stays in the fields */
  serverError?: string
  /** No internet: signing in is blocked with the offline message */
  offline?: boolean
  defaultValues?: Partial<ClubLoginValues>
}

const OFFLINE_MESSAGE = "Signing in needs an internet connection. Try again when you're connected."
const SUMMARY_ID = 'club-login-error'

/** Q-LOGIN: the club account sign-in, inside the shared AuthCard. */
export function ClubLoginForm({
  onSubmit,
  isPending = false,
  serverError,
  offline = false,
  defaultValues,
}: ClubLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<ClubLoginValues>({
    resolver: zodResolver(clubLoginSchema),
    defaultValues: { ...clubLoginDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState
  const missing = Boolean(errors.username || errors.password)
  const message = offline ? OFFLINE_MESSAGE : missing ? CLUB_LOGIN_REQUIRED : serverError

  return (
    <AuthCard
      title="Club login"
      tagline="Run the game."
      footer="Club access is set up and licensed by the ROTRA platform owner."
    >
      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-[18px]"
          onSubmit={form.handleSubmit((values) => {
            if (!offline && !isPending) onSubmit(values)
          })}
        >
          {message ? (
            <div id={SUMMARY_ID}>
              <Notice tone="error">{message}</Notice>
            </div>
          ) : null}
          <Field label="Username" hint="Your club account username, not a player phone or email.">
            <Controller
              control={form.control}
              name="username"
              render={({ field }) => (
                <TextInput
                  {...field}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  invalid={Boolean(errors.username)}
                  aria-invalid={errors.username ? true : undefined}
                  aria-errormessage={errors.username ? SUMMARY_ID : undefined}
                />
              )}
            />
          </Field>
          <Field label="Password">
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    invalid={Boolean(errors.password)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-errormessage={errors.password ? SUMMARY_ID : undefined}
                  />
                )}
              />
              <Button
                size="sm"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((show) => !show)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </Button>
            </div>
          </Field>
          <Button type="submit" variant="primary" block disabled={isPending || offline}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </FormProvider>
    </AuthCard>
  )
}
