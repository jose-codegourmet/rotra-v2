'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { GoogleButton } from '@rotra/ui/google-button'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { Notice } from '@rotra/ui/notice'
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
  /** Mock data only: the sample-account hint and "Any password works" placeholder. */
  prototypeHints?: boolean
  /** Shows "By continuing you agree to the Terms of Service and Privacy Policy." under the card. */
  legalLinks?: { termsHref: string; privacyHref: string }
  /**
   * P12: Continue with Google at the top, the context and not-connected notices, the divider "Signed
   * up with a password?", Forgot password? beside the Password label and the new footer. Leave it out
   * (the feature flag is off) and the form renders exactly as before.
   */
  google?: SignInGoogle
}
/** Continue with Google on P-LOGIN. Opt-in: without it the form is the email + password form it always was. */
export type SignInGoogle = {
  onContinue: () => void
  /** Google's window is open or its answer is being read: "Waiting for Google…" */
  pending?: boolean
  /** "December 31, 2026": "Google sign-in is required from <deadline>." */
  deadlineLabel: string
  /** Invite context: "Sign in to join <club>." / "Sign in to request a spot in <session>." */
  contextMessage?: string
  /** A Google email with no ROTRA account: shows "This Google account isn't connected to ROTRA." */
  notConnectedEmail?: string
}
const legalLinkClass = 'text-accent underline underline-offset-[3px]'
/**
 * P-LOGIN: email + password. The sample hint and password placeholder show only with `prototypeHints`;
 * `legalLinks` adds the Terms of Service and Privacy Policy line under the card (D-2026-11-17-01).
 */
export function SignInForm({
  onSubmit,
  onForgotPassword,
  isPending = false,
  offline = false,
  serverError,
  successNote,
  defaultValues,
  prototypeHints = false,
  legalLinks,
  google,
}: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { ...signInDefaultValues, ...defaultValues },
  })
  const errors = form.formState.errors
  const submitOnce = useSubmitOnce(isPending)
  const notices = google ? (
    <>
      {google.contextMessage ? <Notice tone="info">{google.contextMessage}</Notice> : null}
      {successNote ? <Notice tone="success">{successNote}</Notice> : null}
      {google.notConnectedEmail ? (
        <Notice tone="warn" title="This Google account isn't connected to ROTRA.">
          <span className="flex flex-col gap-2">
            <span>No ROTRA account uses or is connected to {google.notConnectedEmail}.</span>
            <span>
              <b>Already a ROTRA player?</b> Sign in below with your email and password, then
              connect this Google account. We'll ask you right after you sign in.
            </span>
            <span>
              <b>New to ROTRA?</b> Open your club's invite link or a session invite to create your
              account.
            </span>
          </span>
        </Notice>
      ) : null}
    </>
  ) : undefined
  return (
    <AuthCard
      title="Sign in"
      tagline="Your player profile."
      contextNotice={notices}
      google={
        google ? (
          <GoogleButton
            pending={google.pending}
            disabled={offline || isPending}
            onClick={google.onContinue}
          />
        ) : undefined
      }
      footer={
        google
          ? "New to ROTRA? Create your account from your club's invite link or a session invite. You don't need an account to view profiles or the leaderboard."
          : "New to ROTRA? A club adds you first, then sends you a link to finish registering. You don't need an account to view profiles or the leaderboard."
      }
      below={
        legalLinks ? (
          <p className="m-0">
            By continuing you agree to the{' '}
            <a href={legalLinks.termsHref} className={legalLinkClass}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href={legalLinks.privacyHref} className={legalLinkClass}>
              Privacy Policy
            </a>
            .
          </p>
        ) : undefined
      }
    >
      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-[18px]"
          onSubmit={form.handleSubmit((values) => {
            if (!offline) submitOnce(() => onSubmit(values))
          })}
        >
          {google ? (
            <p className="m-0 text-[13px] text-fg2">
              Sign in with your email and password once, then connect Google. Google sign-in is
              required from {google.deadlineLabel}.
            </p>
          ) : null}
          {successNote && !google ? <Notice tone="success">{successNote}</Notice> : null}
          {offline || serverError ? (
            <Notice tone="error">
              {offline ? "You're offline. Signing in needs an internet connection." : serverError}
            </Notice>
          ) : null}
          {errors.email && errors.password ? (
            <Notice tone="error">Check the fields below and try again.</Notice>
          ) : null}
          <Field
            label="Email"
            error={errors.email?.message}
            hint={
              prototypeHints
                ? 'The email you registered with. Prototype: try jose@example.com'
                : 'The email you registered with.'
            }
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
          <Field
            label="Password"
            error={errors.password?.message}
            labelAction={
              google ? (
                <Button variant="ghost" size="xs" onClick={onForgotPassword}>
                  Forgot password?
                </Button>
              ) : undefined
            }
          >
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={
                      prototypeHints ? 'Any password works in this prototype' : undefined
                    }
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
          {google ? null : (
            <Button variant="ghost" block onClick={onForgotPassword}>
              Forgot password?
            </Button>
          )}
        </form>
      </FormProvider>
    </AuthCard>
  )
}
