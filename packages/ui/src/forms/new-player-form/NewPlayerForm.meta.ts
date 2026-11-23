import type { ComponentMeta } from '@rotra/ui/meta'

export const newPlayerFormMeta = {
  name: 'NewPlayerForm',
  description:
    'Q-ADD-PLAYER › New player: full or display name (required), nickname, email and social link (optional), and the level for this club. Submits "Confirm player slot", or "Add to waitlist" when every slot is taken.',
  usage: [
    'Use inside AddPlayerSheet on the New player tab; it works offline because nothing is looked up.',
    'context="club" (Saved players › Add player) uses newSavedPlayerSchema: the level is optional (null when empty), the label reads "Level for this club (optional)" and the submit Save player.',
    'onSubmit receives nickname and email as null when empty and a required level. No email saves a guest; an email saves an unclaimed player with an RTR ID, or links a ROTRA player when the email is already on ROTRA (D-2026-11-16-04). The email is checked with the shared emailField from @rotra/schema.',
    'socialLink (#1019) is a Facebook, Instagram, YouTube or LinkedIn profile link checked with normalizeSocialLink from @rotra/schema/social-link; like an email it saves an unclaimed player with an RTR ID, or links the unclaimed player who already has it. It is public on their profile. socialLinkError shows a server refusal under the field.',
    'emailSavedAs (the container found the email on a saved player) shows "That email is already NAME in your saved players." under the field; nothing is saved.',
    'Pass id and hideSubmit to submit it from a sheet footer button (type="submit" form={id}). Remount it (new key) to clear it after an add; autoFocus puts the cursor back in the name field.',
    'The form never adds: the container owns the mutation, the success toast and serverError. A failed add keeps what was typed.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.add › New player tab, confirmNew()',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-add-player--searchadd-to-roster',
    'docs/business_logic/product/queue/modules/players/README.md#entry-and-identity',
    'docs/coding-conventions.md#6-forms',
  ],
  related: ['AddPlayerSheet', 'PlayerConfirmCard', 'LevelSelect', 'Field'],
} satisfies ComponentMeta
