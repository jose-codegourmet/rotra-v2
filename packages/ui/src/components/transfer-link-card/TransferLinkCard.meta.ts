import type { ComponentMeta } from '@rotra/ui/meta'

export const transferLinkCardMeta = {
  name: 'TransferLinkCard',
  description:
    'The card a person sees on the session page opened from a transfer link (?transfer=<token>): sign up or log in to claim, Claim this slot (first claimant only), the pending claim with Withdraw claim, the approved slot, or why the link no longer works.',
  usage: [
    'Pass state and senderName from useTransferLink (TransferLinkView); signedIn from the page’s Player sign-in.',
    'Not signed in: pass registerHref (the session-link registration back to this link) and logInHref.',
    'Signed in: onClaim while open, onWithdraw while yours; claimBlock replaces Claim this slot when the viewer already has a slot here.',
    'claimed, own, closed, expired and cancelled show a warn notice with what to do next.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Transfer link card (transferLinkCard())',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['Card', 'Notice', 'Button', 'TransferLinkSheet', 'JoinRequestCard'],
} satisfies ComponentMeta
