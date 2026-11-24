'use client'
import { MockError } from '@rotra/data/mock/errors'
import type { OnboardingAnswers } from '@rotra/data/player/onboarding-answers'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { useSaveMyOnboardingAnswers } from '@rotra/data/player/useSaveMyOnboardingAnswers'
import { useSetMyGender } from '@rotra/data/player/useSetMyGender'
import { useUpdateMyProfile } from '@rotra/data/player/useUpdateMyProfile'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { isRealDataMode } from '@rotra/data/real/mode'
import type { GettingToKnowValues } from '@rotra/schema/getting-to-know'
import { maskPhone } from '@rotra/schema/phone'
import {
  gettingToKnowDefaultValues,
  gettingToKnowFromProfile,
} from '@rotra/ui/getting-to-know-fields/default-values'
import { type OnboardingQuestionStep, OnboardingStepForm } from '@rotra/ui/onboarding-step-form'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { YourDetailsForm } from '@rotra/ui/your-details-form'
import { yourDetailsFromProfile } from '@rotra/ui/your-details-form/default-values'
import { useState } from 'react'
import { OnboardingChrome } from './OnboardingChrome'

type Step = OnboardingQuestionStep | 'details'

export type OnboardingFlowProps = {
  playerId: string
  /** "How do you play, NAME?" */
  firstName: string
  /** The Google account the player signs in with; omitted for email + password */
  googleEmail?: string
  /** Finish, or Skip on the last question: the container shows the done page */
  onFinish: () => void
}

/** Only this step's answers change: Skip clears them, Continue takes what was picked. */
function withStep(
  answers: GettingToKnowValues,
  step: OnboardingQuestionStep,
  from: GettingToKnowValues,
): GettingToKnowValues {
  if (step === 2) return { ...answers, playStyle: from.playStyle }
  if (step === 3) return { ...answers, shots: from.shots, shotsOther: from.shotsOther }
  return {
    ...answers,
    favoritePlayer: from.favoritePlayer,
    favoritePlayerOther: from.favoritePlayerOther,
  }
}

const toAnswers = (values: GettingToKnowValues): OnboardingAnswers => ({
  playStyle: values.playStyle === '' ? null : values.playStyle,
  shots: values.shots as OnboardingAnswers['shots'],
  shotsOther: values.shotsOther,
  favoritePlayer:
    values.favoritePlayer === ''
      ? null
      : (values.favoritePlayer as OnboardingAnswers['favoritePlayer']),
  favoritePlayerOther: values.favoritePlayerOther,
})

/**
 * P-ONBOARD steps 2 to 4 (Where you play, Shots you know, Favorite player) after the account exists,
 * and the Back to details form. Answers are held here and saved once, on Finish or on Skip of the
 * last question. Mock mode only (the real storage shape is open, D-2026-11-19-11).
 */
export function OnboardingFlow({
  playerId,
  firstName,
  googleEmail,
  onFinish,
}: OnboardingFlowProps) {
  const profile = usePlayerProfile(playerId)
  const account = useMyAccount(playerId)
  const save = useSaveMyOnboardingAnswers()
  const updateProfile = useUpdateMyProfile()
  const setGender = useSetMyGender()
  const [step, setStep] = useState<Step>(2)
  const [answers, setAnswers] = useState<GettingToKnowValues | null>(null)
  const [detailsError, setDetailsError] = useState<string>()
  const current =
    answers ?? (profile.data ? gettingToKnowFromProfile(profile.data) : gettingToKnowDefaultValues)
  const go = (next: Step) => {
    setStep(next)
    window.scrollTo(0, 0)
  }

  const finish = (final: GettingToKnowValues) => {
    save.mutate(toAnswers(final), {
      onSuccess: () => onFinish(),
      onError: (error) => {
        // Real mode has no storage for the answers yet: the account is made, so carry on to the done page.
        if (isRealDataMode()) return onFinish()
        toast.error(error.message)
      },
    })
  }
  const advance = (step: OnboardingQuestionStep, next: GettingToKnowValues) => {
    setAnswers(next)
    if (step === 4) finish(next)
    else go((step + 1) as OnboardingQuestionStep)
  }

  if (profile.isPending)
    return (
      <>
        <OnboardingChrome />
        <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-4 px-4 pt-24">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40" />
        </main>
      </>
    )
  if (step === 'details' && profile.data)
    return (
      <>
        <OnboardingChrome />
        <YourDetailsForm
          defaultValues={yourDetailsFromProfile(profile.data)}
          signInWith={googleEmail ?? account.data?.email ?? ''}
          maskedPhone={account.data?.phone ? maskPhone(account.data.phone) : ''}
          isPending={updateProfile.isPending || setGender.isPending}
          serverError={detailsError}
          onCancel={() => go(2)}
          onSubmit={({ gender, ...personal }) => {
            setDetailsError(undefined)
            updateProfile.mutate(personal, {
              onSuccess: () =>
                setGender.mutate(gender === '' ? null : gender, {
                  onSuccess: () => {
                    toast('Details saved')
                    go(2)
                  },
                  onError: (error) => setDetailsError(error.message),
                }),
              onError: (error) =>
                setDetailsError(
                  error instanceof MockError
                    ? error.message
                    : "Couldn't save your details. Try again.",
                ),
            })
          }}
        />
      </>
    )
  const question = step === 'details' ? 2 : step
  return (
    <>
      <OnboardingChrome />
      <OnboardingStepForm
        key={question}
        step={question}
        firstName={firstName}
        defaultValues={current}
        isPending={save.isPending}
        onBack={() =>
          question === 2 ? go('details') : go((question - 1) as OnboardingQuestionStep)
        }
        onSkip={() => advance(question, withStep(current, question, gettingToKnowDefaultValues))}
        onSubmit={(values) => advance(question, withStep(current, question, values))}
      />
    </>
  )
}
