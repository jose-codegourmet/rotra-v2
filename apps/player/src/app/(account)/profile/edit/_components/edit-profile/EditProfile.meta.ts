import type { ComponentMeta } from '@rotra/ui/meta'
export const editProfileMeta = {
  name: 'EditProfile',
  description:
    "P-EDIT-PROFILE container: loads the signed-in player's profile and contacts, saves with useUpdateMyProfile, and guards unsaved edits with D-DISCARD.",
  usage: [
    'Signed-out visitors never reach it: proxy.ts sends /profile/* to sign-in with returnTo.',
    "Success toasts 'Profile saved' and returns to the profile; a failed or offline save keeps every typed value.",
    'Picture changes save independently of the personal details draft and do not mark it dirty.',
    "Banner: the swatches are the shown banners (useShownProfileBanners); a pick saves at once with useSetMyProfileBanner and toasts 'Banner updated', outside Save changes. Players never upload a banner.",
    'D-DISCARD opens for Cancel, the back button, the top bar and browser Back, only when something changed.',
    'Request a phone or email change opens the P-CONTACT-REQUEST sheet over the form (the draft stays); Phone privacy goes to /profile/privacy-and-contact.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Edit profile (viewEdit, FORM.edit, ACT.cancelEdit, SHEETS.discard)',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/dialogs.md',
  ],
  variants: ['loading', 'error', 'editing', 'saving', 'save-failed', 'offline', 'discard'],
} satisfies ComponentMeta
