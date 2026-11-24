import type { ComponentMeta } from '@rotra/ui/meta'
export const personalDetailsFieldsMeta = {
  name: 'PersonalDetailsFields',
  description:
    'The personal fields a player can edit, grouped as Name, Playing style and Links: full name, nickname, experience and four social links. The free-text playing style is gone (D-2026-11-19-11); the Where you play, Shots and Favorite player pickers are GettingToKnowFields.',
  usage: [
    'Render inside a parent form that owns FormProvider and personalDetailsFieldsSchema; it reads the form context.',
    'Edit profile passes one section at a time; the claim form (P03.4) passes all three.',
    'The four link fields stack one per row at every width (log 2026-11-11-player-edit-profile-links-rows).',
    'Never add phone, email or the RTR ID here; they are not editable through this form.',
    'Open decisions: field limits, link visibility use the prototype placeholders.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'fieldsBasics, fieldsGame, fieldsLinks, personalFields',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/modules/player-information/access-registration.md',
  ],
  variants: ['name', 'nickname', 'playing-text', 'playing-style', 'links'],
  related: ['EditProfileForm'],
} satisfies ComponentMeta
