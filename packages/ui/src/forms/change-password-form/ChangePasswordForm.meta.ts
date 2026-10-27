import type { ComponentMeta } from '@rotra/ui/meta'

export const changePasswordFormMeta = {
  name: 'ChangePasswordForm',
  description:
    'Club settings › Account: the club username, the Change password form (current, new, confirm with a Show passwords toggle) and Sign out.',
  usage: [
    'The container owns useChangeClubPassword, the success toast ("Password changed. Use the new one next time you sign in.") and passes the wrong-current error through serverError.',
    'Submit stays disabled until all three fields are filled; what was typed stays after a failure.',
    'Sign out opens SignOutSheet (D-SIGN-OUT) through onSignOut.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-CLUB › viewClub() #club-account',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['SignOutSheet', 'ClubSettingsMenu', 'TextInput'],
} satisfies ComponentMeta
