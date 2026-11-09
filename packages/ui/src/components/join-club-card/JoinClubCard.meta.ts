import type { ComponentMeta } from '@rotra/ui/meta'
export const joinClubCardMeta = {
  name: 'JoinClubCard',
  description: 'JoinClubCard for Player Information.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Registration and own profile',
  },
  variants: ['Default', 'Pending', 'AlreadyIn', 'LongName', 'Failure'],
} satisfies ComponentMeta
