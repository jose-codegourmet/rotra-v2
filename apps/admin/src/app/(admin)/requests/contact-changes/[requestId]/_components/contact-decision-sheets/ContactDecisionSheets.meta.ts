import type { ComponentMeta } from '@rotra/ui/meta'

export const contactDecisionSheetsMeta = {
  name: 'ContactDecisionSheets',
  description:
    'D-CONTACT container: the "Approve {field} change?" ConfirmSheet (KeyValueList Player, RTR ID, From, To) and the "Decline this request?" ConfirmSheet over useApproveContactChange and useDeclineContactChange.',
  usage: [
    'Mounted by ContactReview; Approve and Decline in the review action row set decision. Pass the request detail, the player’s first name, decision and onClose.',
    'Approve: Return to request · Approve change ("Approving…"); success closes and toasts "Approved. Applying the change…". Applied / Not applied are toasted by ContactReview when the application settles, never on save.',
    'Decline: Back · Decline request (danger, "Declining…"); success closes and toasts "Declined. {first} keeps the current {field}." Clarification and notifications are open decisions (prototype placeholder: decline closes the request).',
    'Failure (e.g. the data layer recheck finds a check now fails: CONTACT_REVIEW_STALE_ERROR) stays open with the error in the sheet and an error toast; the checks refresh.',
    "Offline (useAdminConnectivity), the confirm sends nothing and shows ADMIN_OFFLINE_ERROR in the sheet; each refused tap re-arms ConfirmSheet's one-commit guard. While saving the sheet can't be closed.",
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'SHEETS.approve / decline; ACT.doApprove / doDecline',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/admin/players-requests.md',
  ],
  related: ['ConfirmSheet', 'KeyValueList', 'Toaster'],
} satisfies ComponentMeta
