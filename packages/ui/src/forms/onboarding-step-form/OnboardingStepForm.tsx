'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import type { GettingToKnowValues } from '@rotra/schema/getting-to-know'
import { GettingToKnowFields } from '@rotra/ui/getting-to-know-fields'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { OnboardingFrame } from '@rotra/ui/onboarding-frame'
import { StepBanner } from '@rotra/ui/step-banner'
import { useId } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { onboardingStepDefaultValues } from './OnboardingStepForm.defaultValues'
import { onboardingStepSchema } from './OnboardingStepForm.schema'

export type OnboardingQuestionStep = 2 | 3 | 4

export type OnboardingStepFormProps = {
  /** 2 Where you play, 3 Shots you know, 4 Favorite player */
  step: OnboardingQuestionStep
  /** "How do you play, NAME?" */
  firstName: string
  defaultValues?: GettingToKnowValues
  onBack: () => void
  /** Clears this step's answer and moves on; the container does both */
  onSkip: () => void
  /** Continue / Finish with the answers as typed; the container saves them */
  onSubmit: (values: GettingToKnowValues) => void
  isPending?: boolean
  /** Image paths the app supplies; default to the player app's /art/onboarding files */
  shotsBannerSrc?: string
  favoriteBannerSrc?: string
}

const STEP_NAMES = { 2: 'Where you play', 3: 'Shots you know', 4: 'Favorite player' } as const

/**
 * P-ONBOARD steps 2 to 4: one question per step in the fullscreen frame, with Back, Skip and
 * Continue (Finish on the last). The container owns saving and the step; the form never mutates.
 */
export function OnboardingStepForm({
  step,
  firstName,
  defaultValues = onboardingStepDefaultValues,
  onBack,
  onSkip,
  onSubmit,
  isPending = false,
  shotsBannerSrc = '/art/onboarding/shots-banner.webp',
  favoriteBannerSrc = '/art/onboarding/favorite-banner.webp',
}: OnboardingStepFormProps) {
  const form = useForm<GettingToKnowValues>({
    resolver: zodResolver(onboardingStepSchema),
    defaultValues,
  })
  const formId = useId()
  const submitOnce = useSubmitOnce(isPending)
  const heading =
    step === 2
      ? {
          title: `How do you play, ${firstName}?`,
          hint: "Pick where you're most at home on court.",
        }
      : step === 3
        ? {
            title: 'Which shots do you have?',
            hint: 'Pick all that apply, or add your own with Others. Clubs see these when they plan matches.',
          }
        : {
            title: "Who's your favorite badminton player?",
            hint: 'Pick one, or choose Others and type a name.',
          }
  return (
    <OnboardingFrame
      step={step}
      stepName={STEP_NAMES[step]}
      onBack={onBack}
      onSkip={onSkip}
      primaryLabel={step === 4 ? 'Finish' : 'Continue'}
      primaryFormId={formId}
      primaryPending={isPending}
    >
      <div className="flex flex-col gap-1.5">
        <h1>{heading.title}</h1>
        <p className="text-fg2">{heading.hint}</p>
      </div>
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit((values) => submitOnce(() => onSubmit(values)))}
        >
          {step === 3 ? (
            <StepBanner
              src={shotsBannerSrc}
              alt="Tara with a fan of shot paths: smash, drop, clear, drive and net shot"
            />
          ) : null}
          {step === 4 ? (
            <StepBanner
              src={favoriteBannerSrc}
              alt="Tara and Rion cheering in the stands at a pro player under the spotlight"
            />
          ) : null}
          <GettingToKnowFields
            sections={[step === 2 ? 'court' : step === 3 ? 'shots' : 'favorite']}
            disabled={isPending}
          />
        </form>
      </FormProvider>
      <p className="text-[13px] text-fg2">
        Shows on your public profile. You can change it any time in Edit profile.
      </p>
    </OnboardingFrame>
  )
}
