import type { ComponentMeta } from '@rotra/ui/meta'
export const personalDetailsFieldsMeta = {
  name: 'PersonalDetailsFields',
  description:
    'The personal fields a player can edit, grouped as Name, Playing style and Links: full name, nickname, playing style, experience and four social links.',
  usage: [
    'Render inside a parent form that owns FormProvider and personalDetailsFieldsSchema; it reads the form context.',
    'Edit profile passes one section at a time; the claim form (P03.4) passes all three.',
    'Never add phone, email or the RTR ID here; they are not editable through this form.',
    'Open decisions: field limits, free-text playing style and link visibility use the prototype placeholders.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'fieldsBasics, fieldsGame, fieldsLinks, personalFields',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/modules/player-information/access-registration.md',
  ],
  variants: ['name', 'playing-style', 'links'],
  related: ['EditProfileForm'],
} satisfies ComponentMeta
