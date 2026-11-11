import type { ComponentMeta } from '@rotra/ui/meta'
export const clubInviteCardMeta = {
  name: 'ClubInviteCard',
  description:
    'A thin wrapper over ShareCard (club-invite variant). The club share card: "<club> invites you to play", "Register with ROTRA and join the club", the club logo or initials inside the QR, "Scan to join", the link, a Post (4:5) | Story (9:16) switch, a full-width Copy invite link button, then Share or Download image. Fixed dark branding in both themes.',
  usage: [
    'Use inside a Sheet titled "Share club invite" on Q-CLUB. Pass the club invite link (Q19.6), never a session link.',
    'Share shows where the browser can share an image file; otherwise only Download image shows. The file is named rotra-club-<slug>-<post|story>.png.',
    'Copy invite link (onCopyLink, full width on its own row above Share) copies the same link the QR encodes; the app owns the clipboard write and the "Club invite link copied" toast.',
    'Club logos that cannot be loaded for canvas export fall back to initials in both the card and PNG.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Club settings › Share club invite sheet (sessionQr, club)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  variants: ['post', 'story', 'logo', 'initials'],
  related: ['ShareCard', 'SessionJoinQr', 'ClubLogo', 'SegmentedControl'],
} satisfies ComponentMeta
