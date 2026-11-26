import type { ComponentMeta } from '@rotra/ui/meta'

export const yourDetailsFormMeta = {
  name: 'YourDetailsForm',
  description:
    'P-ONBOARD › Back on the first question reopens Your details for the account that now exists: Full name, required Gender and the Optional fold prefilled, sign-in and phone read-only, Cancel and Continue.',
  usage: [
    'The container saves with useUpdateMyProfile and useSetMyGender, toasts "Details saved" and returns to the question; Cancel returns without saving.',
    'The sign-in method and the masked phone are display-only; changing them goes through Privacy and contact.',
    'Not used for the first pass (that is ClaimForm); the frame says "Step 1 of 4" the same way.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewObDetails, ACT.obBack/obDetailsBack, FORM.obDetails',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-19-player-details-step-mobile.md',
  ],
  related: ['ClaimForm', 'OnboardingStepForm', 'OnboardingFrame'],
} satisfies ComponentMeta
