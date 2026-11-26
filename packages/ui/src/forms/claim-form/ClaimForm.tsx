'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Field, RequiredPill } from '@rotra/ui/field'
import { GenderChips } from '@rotra/ui/gender-chips'
import { GoogleIdentityRow } from '@rotra/ui/google-identity-row'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { Notice } from '@rotra/ui/notice'
import { OnboardingFrame } from '@rotra/ui/onboarding-frame'
import { OptionalFold } from '@rotra/ui/optional-fold'
import { PersonalDetailsFields } from '@rotra/ui/personal-details-fields'
import { PhoneOrEmailInput } from '@rotra/ui/phone-or-email-input'
import { Select, type SelectOption } from '@rotra/ui/select'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId, useState } from 'react'
import { Controller, FormProvider, type Resolver, useForm } from 'react-hook-form'
import { claimDefaultValues } from './ClaimForm.defaultValues'
import { type ClaimValues, claimGoogleSchema, claimSchema } from './ClaimForm.schema'

export type ClaimFormProps = {
  clubName: string
  contextLabel?: string
  cities?: SelectOption[]
  /** Shown read-only, exactly as received. Empty when the profile has no phone: the player types one. */
  maskedPhone: string
  defaultValues?: Partial<ClaimValues>
  onSubmit: (values: ClaimValues) => void
  isPending?: boolean
  /** An email or phone problem shows under that field; anything else as a notice at the top */
  serverError?: { message: string; field?: 'email' | 'phone' | 'cityCode' }
  /** Guest invitation: empty registration, with no existing profile or guest linkage. */
  standalone?: boolean
  accountMatch?: boolean
  onDismissMatch?: () => void
  /**
   * Google mode (player_google_sign_in flag): the Google account row replaces Email, Password and
   * Confirm password, and the email is Google's. `onChange` is "← Other ways to sign up" (standalone)
   * or "← Use another Google account" (claim).
   */
  google?: { name: string; email: string; onChange: () => void }
  /**
   * Google registration after the person picked one club's version in IdentityPicker
   * (D-2026-11-16-04): the notice “You picked CLUB's version of you…” shows above the fields.
   */
  pickedIdentity?: { clubName: string; rtrId: string }
  /**
   * Google registration with an email exactly one club saved: the notice “CLUB already saved a
   * profile with this email.” shows above the fields; its details are the form's defaultValues.
   */
  emailMatch?: { clubName: string; rtrId: string }
}
const sectionHeading = 'text-[15px] font-semibold'
/** The optional fields' keys, so the fold opens by itself when one of them has an error. */
const FOLD_KEYS = [
  'nickname',
  'experienceYears',
  'experienceMonths',
  'facebook',
  'instagram',
  'youtube',
  'linkedin',
] as const
/**
 * P-ONBOARD step 1, Your details (P-CLAIM's fields): the fullscreen frame with "Step 1 of 4", a
 * Needed to continue card (Full name, Gender, the Google account or email and password, the mobile
 * number, City), the folded Optional card, and a fixed Continue footer. Sending it creates the account.
 */
export function ClaimForm({
  clubName,
  contextLabel,
  cities,
  maskedPhone,
  defaultValues,
  onSubmit,
  isPending = false,
  serverError,
  standalone = false,
  accountMatch = false,
  onDismissMatch,
  google,
  pickedIdentity,
  emailMatch,
}: ClaimFormProps) {
  const [showPasswords, setShowPasswords] = useState(false)
  const form = useForm<ClaimValues>({
    resolver: google
      ? (zodResolver(claimGoogleSchema) as unknown as Resolver<ClaimValues>)
      : zodResolver(claimSchema),
    defaultValues: { ...claimDefaultValues, ...defaultValues },
  })
  const formId = useId()
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
  const clubFilledIn = !standalone || Boolean(emailMatch)
  const foldHasError = FOLD_KEYS.some((key) => errors[key])
  return (
    <OnboardingFrame
      step={1}
      stepName="Your details"
      hint="Next: 3 quick questions"
      primaryLabel={isPending ? (standalone ? 'Creating…' : 'Completing…') : 'Continue'}
      primaryFormId={formId}
      primaryPending={isPending}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase [overflow-wrap:anywhere]">
          {contextLabel ?? `Registration link from ${clubName}`}
        </span>
        <h1>Your details</h1>
        <p className="m-0 text-fg2">
          Check what {clubFilledIn ? 'your club filled in' : 'you need to fill in'}. Only fields
          marked <RequiredPill /> are needed to continue; the rest can wait.
        </p>
        {google ? (
          <div>
            <Button size="sm" variant="ghost" onClick={google.onChange}>
              {standalone ? '← Other ways to sign up' : '← Use another Google account'}
            </Button>
          </div>
        ) : null}
      </div>
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => {
            if (needsPhone && !values.phone.trim()) {
              form.setError('phone', { type: 'required', message: 'Enter your mobile number.' })
              return
            }
            if (cities && !cities.some((city) => city.value === values.cityCode)) {
              form.setError('cityCode', { message: 'Pick your city or province.' })
              return
            }
            submitOnce(() => onSubmit(needsPhone ? values : { ...values, phone: '' }))
          })}
        >
          {accountMatch ? (
            <Notice
              tone="warn"
              title="Is this your account?"
              action={
                <>
                  <Button asChild variant="primary">
                    <a href="/login">Yes, sign in</a>
                  </Button>
                  <Button asChild>
                    <a href="/forgot-password">Recover account</a>
                  </Button>
                  <Button
                    onClick={() => {
                      onDismissMatch?.()
                      form.setFocus('phone')
                    }}
                  >
                    No, edit my details
                  </Button>
                </>
              }
            >
              A ROTRA account or profile already uses this phone number or email. If you have not
              registered yet, ask your club for your profile's registration link. Otherwise correct
              your details or contact ROTRA for help. No accounts were linked.
            </Notice>
          ) : null}
          {serverError && !serverError.field ? (
            <Notice tone="error">{serverError.message}</Notice>
          ) : null}
          {pickedIdentity ? (
            <Notice>
              You picked <b>{pickedIdentity.clubName}</b>&apos;s version of you as your starting
              profile. Change anything that&apos;s wrong. Your player ID stays{' '}
              <span className="font-mono">{pickedIdentity.rtrId}</span>.
            </Notice>
          ) : null}
          {emailMatch ? (
            <Notice title={`${emailMatch.clubName} already saved a profile with this email.`}>
              Its details are filled in below. Your player ID stays{' '}
              <span className="font-mono">{emailMatch.rtrId}</span> and your games carry over.
            </Notice>
          ) : null}
          <Card asChild>
            <section className="flex flex-col gap-4" aria-labelledby={`${formId}-needed`}>
              <h2 id={`${formId}-needed`} className={sectionHeading}>
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
                    disabled={isPending}
                  />
                )}
              />
              {google ? (
                <Field label="Signs in with" hint="This becomes your ROTRA email. Private.">
                  <GoogleIdentityRow name={google.name} email={google.email} chip="confirmed" />
                </Field>
              ) : null}
              {needsPhone ? (
                <Field
                  label="Mobile number"
                  required
                  hint={errors.phone ? undefined : 'Private. Never shown publicly.'}
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
                  label={
                    <>
                      Phone number <span className="font-normal">· already on file</span>
                    </>
                  }
                  hint="Linked to this profile. Not your number? Ask the club or ROTRA."
                >
                  <TextInput value={maskedPhone} readOnly className="font-mono" />
                </Field>
              )}
              {google ? null : (
                <>
                  <Field
                    label="Email"
                    required
                    hint={errors.email ? undefined : 'For password resets. Private.'}
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
                  <Field label="Password" required error={errors.password?.message}>
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
                  <Field label="Confirm password" required error={errors.confirmPassword?.message}>
                    {passwordInput('confirmPassword')}
                  </Field>
                </>
              )}
              {cities ? (
                <Field
                  label="City or province"
                  required
                  hint={errors.cityCode ? undefined : 'Used in your player ID.'}
                  error={errors.cityCode?.message}
                >
                  <Controller
                    control={form.control}
                    name="cityCode"
                    render={({ field }) => (
                      <Select
                        {...field}
                        options={cities}
                        placeholder="Choose one"
                        disabled={isPending}
                      />
                    )}
                  />
                </Field>
              ) : null}
            </section>
          </Card>
          <OptionalFold
            hasError={foldHasError}
            summary={`Nickname, experience and links${clubFilledIn ? ', prefilled from your club' : ''}`}
          >
            <PersonalDetailsFields
              sections={['nickname', 'playing-style', 'links']}
              disabled={isPending}
            />
            <p className="m-0 text-xs text-fg2">
              You can change all of these later in Edit profile.
            </p>
          </OptionalFold>
        </form>
      </FormProvider>
    </OnboardingFrame>
  )
}
