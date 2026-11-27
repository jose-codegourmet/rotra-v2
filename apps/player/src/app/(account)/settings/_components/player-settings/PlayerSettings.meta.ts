import type { ComponentMeta } from '@rotra/ui/meta'

export const playerSettingsMeta = {
  name: 'PlayerSettings',
  description:
    'P-SETTINGS brings together the signed-in player’s account links, device theme and Sign out.',
  usage: [
    'Open from the main navigation or the Settings button on My profile’s Your account card.',
    'The Dark mode switch uses the same theme as the top bar toggle.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'viewSettings' },
  docs: ['docs/screens/product/navigation.md'],
} satisfies ComponentMeta
