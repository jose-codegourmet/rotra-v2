import type { ComponentMeta } from '@rotra/ui/meta'
export const claimFormMeta = {
  name: 'ClaimForm',
  description:
    'P-ONBOARD step 1, Your details (P-CLAIM fields): the fullscreen frame with a Needed to continue card (name, gender, sign-in, phone, city), a folded Optional card and a fixed Continue footer.',
  usage: [
    'Fullscreen: the OnboardingFrame shows "Step 1 of 4 · Your details" and the footer "Next: 3 quick questions" with Continue ("Creating…" or "Completing…" while sending); the app hides its top bar and dock while it shows.',
    'Gender (Male or Female chips) is required when registering; the error is "Choose Male or Female." Every required label carries the green Required pill. The Optional fold (nickname, experience, links) opens by itself when one of them has an error.',
    'Standalone registration accepts a context label and Admin-link city choices.',
    'standalone opens the empty guest registration form. accountMatch offers sign-in/recovery or editing contacts; it never reveals another profile or links the guest.',
    'The container owns useCompleteClaim, toasts and the next step; the form never mutates.',
    'Submitted values carry gender, email, password and personal details, never the phone when one is on file.',
    'No SMS step, Facebook authorization, age, gear, tournament or self-rating field.',
    'google (player_google_sign_in flag): Google mode. The Google row (Email confirmed) replaces Email, Password and Confirm password, the full name starts from Google, and onChange is "← Other ways to sign up" (standalone) or "← Use another Google account" (claim). Submitted values carry no email or password.',
    'The phone hints say only that it is never shown publicly (standalone) or that the profile has no phone yet; the phone no longer "identifies your ROTRA profile" (the email does, D-2026-11-16-04).',
    'pickedIdentity (after a pick in IdentityPicker) and emailMatch (exactly one club saved the email) add the notice above the fields, with the kept player ID. The container passes the club’s details as defaultValues.',
    'Password has no minimum length until the auth specification sets one.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewClaim › Your details (FORM.claim), obTop',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: [
    'OnboardingFrame',
    'OptionalFold',
    'GenderChips',
    'ClaimIdentityCheck',
    'IdentityPicker',
    'PersonalDetailsFields',
    'AccountLinkStatus',
  ],
} satisfies ComponentMeta
