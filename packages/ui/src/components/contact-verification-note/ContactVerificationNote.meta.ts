import type { ComponentMeta } from '@rotra/ui/meta'

export const contactVerificationNoteMeta = {
  name: 'ContactVerificationNote',
  description:
    "The 'Verification' card on the Admin contact review: what proof approval needs is undecided, so ROTRA asks for no ID documents and the request is the only evidence.",
  usage: [
    'Admin only, on A-CONTACT-REVIEW while the request waits for review, under ContactChecksList.',
    "Placeholder for an open decision (Contact-change approval: evidence needed). Don't add an ID upload or a required evidence field.",
    "The prototype's 'this prototype' reads 'ROTRA'; that is the only wording change.",
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: "A-CONTACT-REVIEW › viewReview() › 'Verification'",
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/open-decisions.md',
  ],
  variants: ['default'],
  related: ['ContactChecksList', 'ApprovalScopeCard'],
} satisfies ComponentMeta
