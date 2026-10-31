import type { ComponentMeta } from '@rotra/ui/meta'

export const signOutSheetMeta = {
  name: 'SignOutSheet',
  description:
    'D-SIGN-OUT: the confirmation behind every Sign out, with the unsynced-changes, live-session and offline notices when they apply.',
  usage: [
    'Open from the Club settings menu, the Account section or the dev menu. The container runs useSignOut in onSignOut and navigates to /login.',
    'Copy is fixed by dialogs.md; Stay signed in receives focus when it opens.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.signOut',
  },
  docs: ['docs/screens/product/dialogs.md'],
  related: ['ConfirmSheet', 'ChangePasswordForm', 'ClubSettingsMenu'],
} satisfies ComponentMeta
