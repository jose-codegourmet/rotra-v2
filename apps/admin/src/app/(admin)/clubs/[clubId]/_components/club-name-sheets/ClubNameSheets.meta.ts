import type { ComponentMeta } from '@rotra/ui/meta'

export const clubNameSheetsMeta = {
  name: 'ClubNameSheets',
  description:
    'D-CLUB-NAME container: the "Approve name change?" ConfirmSheet (ChangeCompare Current / New) and the "Reject name change?" ConfirmSheet over useApproveClubNameChange and useRejectClubNameChange.',
  usage: [
    'Mounted by ClubDetail; Approve name change and Reject on NameChangeRequestCard (Overview tab) set decision. Pass club, decision and onClose.',
    'Approve: Back · Approve name change ("Approving…"); success closes and toasts "Name changed to {name}." The data layer rechecks that no other club has the name.',
    'Reject: Back · Reject request (danger, "Rejecting…"); success closes and toasts "Rejected. The club keeps {name}."',
    'Failure stays open with the error in the sheet and an error toast. A request already decided elsewhere closes silently (changed: false).',
    "The names stay on screen while a sheet closes. Offline (useAdminConnectivity), Approve or Reject sends nothing and shows ADMIN_OFFLINE_ERROR in the sheet; each refused tap re-arms ConfirmSheet's one-commit guard.",
    'Not built: timeout recovery for a name decision (dialogs.md "Recover request status before retrying after a timeout"); the mock has no lost-reply path for it.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'SHEETS.nameApprove / nameReject; ACT.doNameApprove / doNameReject',
  },
  docs: ['docs/screens/product/dialogs.md', 'docs/screens/product/modules/admin/clubs-licenses.md'],
  related: ['ConfirmSheet', 'ChangeCompare', 'NameChangeRequestCard', 'Toaster'],
} satisfies ComponentMeta
