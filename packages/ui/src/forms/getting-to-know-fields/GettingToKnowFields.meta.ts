import type { ComponentMeta } from '@rotra/ui/meta'

export const gettingToKnowFieldsMeta = {
  name: 'GettingToKnowFields',
  description:
    'The three public getting-to-know pickers: Where you play (Front court, Back court, All-round), Shots you know (12 tick chips and your own) and Favorite badminton player (9 players and Others).',
  usage: [
    'Render inside a parent form that owns FormProvider and a schema with the gettingToKnowShape from @rotra/schema/getting-to-know; it reads the form context.',
    'Onboarding passes one section per step (labelled off: the step heading asks). Edit profile › Playing style passes all three with labelled on.',
    'Every answer is optional. Others under Favorite player needs a name; the schema adds the error.',
    'Own shots are checked by ShotChips as they are typed (up to 6, 24 characters, no repeats) and again by the data layer on save.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'fieldsPicks, pickCourt, pickSkills, pickFav',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/modules/player-information/access-registration.md',
  ],
  variants: ['court', 'shots', 'favorite'],
  related: ['OnboardingStepForm', 'EditProfileForm', 'CourtPositionCard', 'ShotChips'],
} satisfies ComponentMeta
