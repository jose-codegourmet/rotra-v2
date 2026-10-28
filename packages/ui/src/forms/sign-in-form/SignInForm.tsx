'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { Notice } from '@rotra/ui/notice'
import { PhoneOrEmailInput } from '@rotra/ui/phone-or-email-input'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { signInDefaultValues } from './SignInForm.defaultValues'
import { type SignInValues, signInSchema } from './SignInForm.schema'
export type SignInFormProps = {
  onSubmit: (values: SignInValues) => void
  onForgotPassword: () => void
  isPending?: boolean
  offline?: boolean
  serverError?: string
  successNote?: string
  defaultValues?: Partial<SignInValues>
}
/** P-LOGIN, including the requested prototype-only sample hint and password placeholder. */
export function SignInForm({
  onSubmit,
  onForgotPassword,
  isPending = false,
  offline = false,
  serverError,
  successNote,
  defaultValues,
}: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { ...signInDefaultValues, ...defaultValues },
  })
  const errors = form.formState.errors
  const submitOnce = useSubmitOnce(isPending)
  return (
    <AuthCard
      title="Sign in"
      tagline="Your player profile."
      footer="New to ROTRA? A club adds you first, then sends you a link to finish registering. You don't need an account to view profiles or the leaderboard."
    >
      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-[18px]"
          onSubmit={form.handleSubmit((values) => {
            if (!offline) submitOnce(() => onSubmit(values))
          })}
        >
          {successNote ? <Notice tone="success">{successNote}</Notice> : null}
          {offline || serverError ? (
            <Notice tone="error">
              {offline ? "You're offline. Signing in needs an internet connection." : serverError}
            </Notice>
          ) : null}
          {errors.identifier && errors.password ? (
            <Notice tone="error">Check the fields below and try again.</Notice>
          ) : null}
          <Field
            label="Phone number or email"
            error={errors.identifier?.message}
            hint="Phone numbers are spaced out as you type. Prototype: try 09175550142 or jose@example.com"
          >
            <Controller
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <PhoneOrEmailInput
                  {...field}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isPending}
                />
              )}
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Any password works in this prototype"
                    disabled={isPending}
                  />
                )}
              />
              <Button
                size="sm"
                className="shrink-0"
                disabled={isPending}
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
          <Button variant="ghost" block onClick={onForgotPassword}>
            Forgot password?
          </Button>
        </form>
      </FormProvider>
    </AuthCard>
  )
}
