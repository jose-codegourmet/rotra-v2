import type { ComponentMeta } from '@rotra/ui/meta'
export const shareCardMeta = {
  name: 'ShareCard',
  description:
    'The one branded share image every share uses: a Post (4:5, 1080 × 1350) | Story (9:16, 1080 × 1920) switch on the fixed dark brand card, an H-correction QR, the link, and Share (Web Share with the drawn image) or Download image. Drawn on the device with canvas.',
  usage: [
    'Player pictures are circles, on screen and in any downloaded image (D-2026-11-11-11).',
    'Player shares supply middle content, a leading copy action and compact corner QR; invites keep the default layout.',
    'primaryRowAbove puts a full-width block (the club invite Copy invite link button) on its own row above the Share / Download image row; leadingAction stays inside the action row.',
    'Pass headline, optional subline, a logo or avatar spot, the title, info lines, QR caption and link. Variants are thin wrappers: SessionJoinQr (session-join) and SessionInviteCard (session-invite) ship now.',
    'Share uses navigator.canShare({ files }); when Web Share is missing or cannot take files, only Download image shows (with actions="share-or-download"). Use onShared, onDownloaded and onError for toasts.',
    'SessionInviteCard reads “NAME invites you to play” with the player avatar spot; the QR caption is “Scan to join” or, with waitlistOpen, “Waitlist open”. Pass the link already carrying ?invite=<code>.',
    'The card uses fixed brand values, so it looks the same in both themes. Images that cannot load for canvas export fall back to initials in the card and the PNG.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Preparation › Session QR sheet · Public session page › My night › Invite › Session invite sheet',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  variants: [
    'post',
    'story',
    'session-join',
    'session-invite',
    'waitlist-open',
    'logo',
    'initials',
    'avatar',
  ],
  related: ['SessionJoinQr', 'SegmentedControl', 'Button', 'ClubLogo', 'Avatar'],
} satisfies ComponentMeta
