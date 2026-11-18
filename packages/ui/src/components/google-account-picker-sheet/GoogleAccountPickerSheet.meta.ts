import type { ComponentMeta } from '@rotra/ui/meta'

export const googleAccountPickerSheetMeta = {
  name: 'GoogleAccountPickerSheet',
  description:
    "Prototype stand-in for Google's own sign-in window: a list of fictional Google accounts, each showing what picking it does. Mock mode only.",
  usage: [
    'Never render it in real mode: the real app redirects to Google. The Player app wires it through one hook so real mode swaps it for a redirect in one place.',
    'Pass accounts from useGoogleAccountPicker(); onPick receives the chosen account (name and email go to useGoogleSignIn or useConnectGoogle).',
    'Picking does not close the sheet itself; the owner of the flow closes it and shows the "Waiting for Google…" pending state on the button.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'SHEETS.gpick',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['Open', 'LongNames'],
  related: ['Sheet', 'Avatar', 'GoogleMark', 'GoogleButton'],
} satisfies ComponentMeta
