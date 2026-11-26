import type { ComponentMeta } from '@rotra/ui/meta'

export const onboardingFlowMeta = {
  name: 'OnboardingFlow',
  description:
    'P-ONBOARD after the account exists: steps 2 to 4 (Where you play, Shots you know, Favorite player) with Back, Skip and Continue / Finish, and Back on step 2 reopening Your details.',
  usage: [
    'Claim and the invite pages render it in place of the form once registering succeeded, then show the done page from onFinish.',
    'Answers are held across steps and saved once with useSaveMyOnboardingAnswers on Finish (or Skip on the last question); Skip clears that step.',
    'Back on step 2 opens YourDetailsForm prefilled; Continue saves with useUpdateMyProfile and useSetMyGender, toasts "Details saved" and returns; Cancel returns.',
    'Mock mode only. In real mode the answers are not stored yet (D-2026-11-19-11), so Finish goes on to the done page.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewOnboard, viewObDetails, startOnboard, finishOnboard',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['OnboardingStepForm', 'YourDetailsForm', 'ClaimForm'],
} satisfies ComponentMeta
