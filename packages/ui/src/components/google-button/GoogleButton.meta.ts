import type { ComponentMeta } from '@rotra/ui/meta'

export const googleButtonMeta = {
  name: 'GoogleButton',
  description:
    'The Google sign-in button: the Google mark and "Continue with Google", a pending state "Waiting for Google…", and a disabled state.',
  usage: [
    'Use for Continue with Google on P-LOGIN and P-INVITE, and (with label "Connect Google") on P-GOOGLE-REQUIRED. Full width by default.',
    "Set pending while Google's window is open; it disables the button so one tap cannot fire twice.",
    'The app starts the Google redirect in onClick. This component never routes or calls auth.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LOGIN, P-INVITE (.btn.google, G_MARK)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['Default', 'Pending', 'Disabled'],
  related: ['GoogleMark', 'Button', 'AuthCard'],
} satisfies ComponentMeta
