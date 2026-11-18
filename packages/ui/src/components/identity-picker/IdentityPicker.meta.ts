import type { ComponentMeta } from '@rotra/ui/meta'

export const identityPickerMeta = {
  name: 'IdentityPicker',
  description:
    'The “Which identity is correct?” dialog: one card per club that saved the email a person registers with, in the share dialog’s carousel. A card shows the club’s logo and name, the club’s picture, name and nickname for the person, and everything that club saved. One tap picks it.',
  usage: [
    'Open it in the Google registration path when more than one club saved the email (D-2026-11-16-04). With one club there is no dialog: Finish registering opens with that club’s details.',
    'Pass one record per club. The phone arrives already masked; an empty value reads “Not added”; the picture row says “A photo” or “Initials”.',
    'The carousel is SnapCarousel: the card in view is centred, the next peeks in, one swipe moves one card, a fade mask shows on a side with hidden cards, dots sit under the strip. A drag never counts as a tap.',
    'onPick gets the record id; the container opens Finish registering with that name and nickname filled in. Cancel (and the ×) call onCancel.',
    'rtrId is the unclaimed record’s player ID, which the person keeps whichever card they pick.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'SHEETS.identity (.idpick, .sh-pick, .facts)',
  },
  docs: [
    'docs/mockup-changes/2026-11-16-player-unclaimed-identity.md',
    'docs/screens/product/modules/player-information/access-registration.md',
  ],
  related: ['SnapCarousel', 'ClaimForm', 'ClubLogo', 'Sheet'],
} satisfies ComponentMeta
