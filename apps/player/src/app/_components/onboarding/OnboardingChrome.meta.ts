import type { ComponentMeta } from '@rotra/ui/meta'

export const onboardingChromeMeta = {
  name: 'OnboardingChrome',
  description:
    'Renders nothing; while mounted, the player shell hides the top bar, announcement bands and dock so the fullscreen onboarding shows only its own header and footer.',
  usage: [
    'Mount it beside the fullscreen step 1 form (ClaimForm) and OnboardingFlow; unmounting restores the shell.',
    'The shell keeps its children in the same place, so the onboarding state survives the switch.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'S.ui.fullscreen' },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
