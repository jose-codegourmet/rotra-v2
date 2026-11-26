import type { ComponentMeta } from '@rotra/ui/meta'

export const onboardingFrameMeta = {
  name: 'OnboardingFrame',
  description:
    'P-ONBOARD fullscreen frame: sticky header with the logo, "Step N of 4 · name" and a progress bar, a content column and a fixed footer with Back, Skip and Continue or Finish. No top bar or dock.',
  usage: [
    'Wrap each of the four onboarding steps; the screen supplies the step number, name and handlers.',
    'Step 1 passes hint="Next: 3 quick questions" and primaryFormId so Continue submits the details form; steps 2 to 4 pass onBack and onSkip; step 4 labels the primary "Finish".',
    'Inputs inside are 48 px tall with 16 px text so phones do not zoom; side padding is tighter at 640 px and narrower.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-ONBOARD › obTop(), .ob, .ob-top, .ob-bar, .ob-foot',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-19-player-details-step-mobile.md',
  ],
  related: ['ProgressBar', 'OptionalFold', 'Field', 'RotraLogo'],
} satisfies ComponentMeta
