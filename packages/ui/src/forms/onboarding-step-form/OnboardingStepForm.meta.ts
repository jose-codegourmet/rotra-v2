import type { ComponentMeta } from '@rotra/ui/meta'

export const onboardingStepFormMeta = {
  name: 'OnboardingStepForm',
  description:
    'P-ONBOARD steps 2 to 4 in the fullscreen frame: Where you play, Shots you know and Favorite player, each with Back, Skip and Continue (Finish on the last).',
  usage: [
    'The container holds the answers across steps, saves them with useSaveMyOnboardingAnswers and decides what Back, Skip and Finish do. Skip clears this step and moves on; on step 4 it finishes.',
    'Others on step 4 needs a name; the error is "Type the player\'s name, or pick another answer." and shows under Player\'s name.',
    'The step 1 form (ClaimForm) and the Back to details form (YourDetailsForm) use the same frame.',
    'Every answer is optional and public; nothing here changes rank.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewOnboard, ACT.obNext/obSkip/obBack',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  variants: ['where-you-play', 'shots-you-know', 'favorite-player'],
  related: ['OnboardingFrame', 'GettingToKnowFields', 'StepBanner'],
} satisfies ComponentMeta
