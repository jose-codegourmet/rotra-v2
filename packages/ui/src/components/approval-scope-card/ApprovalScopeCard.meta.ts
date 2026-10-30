import type { ComponentMeta } from '@rotra/ui/meta'

export const approvalScopeCardMeta = {
  name: 'ApprovalScopeCard',
  description:
    "The 'What approval changes' side card on the Admin contact review: only the sign-in phone number or email changes; never the RTR ID, history, results, rank or another player's profile.",
  usage: [
    'Admin only, under CurrentContactsCard on A-CONTACT-REVIEW.',
    "Pass the request's field and the player's nickname or first name.",
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: "A-CONTACT-REVIEW › viewReview() › 'What approval changes'",
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  variants: ['phone', 'email'],
  related: ['CurrentContactsCard', 'ContactChecksList', 'ContactVerificationNote'],
} satisfies ComponentMeta
