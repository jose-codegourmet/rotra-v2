import type { ComponentMeta } from '@rotra/ui/meta'

export const addClubSheetMeta = {
  name: 'AddClubSheet',
  description:
    'A-ADD-CLUB container: a Sheet titled "Add club" with a local form → review step, AddClubForm (foundingCities, takenNames/takenUsernames from useClubIdentityIndex) and AddClubReview, and Create club over useAddClub.',
  usage: [
    'Mounted by ClubDirectory; the Add club button in its PageHeader actions opens it. Pass open and onOpenChange.',
    'AddClubForm and AddClubReview render their own steps and buttons, so the Sheet has no footer. Back returns to the form with every value kept.',
    'The password lives only in this component state and the mutation call; the review shows its length. Closing clears it.',
    'Create club sends one sourceCommandId generated on entering review, so a double tap or retry creates one club. Success closes the sheet, toasts "{name} added. Activate a license so it can run sessions." and pushes /clubs/{id}?tab=license. Failure stays on review with serverError and an error toast.',
    'While saving the sheet has no close button and ignores Escape and the scrim. A ref keeps repeated taps to one request.',
    'Closing (Cancel, close button, Escape, scrim) with any field typed (AddClubForm onDirtyChange) or from the review opens a ConfirmSheet "Discard this club?" / "Nothing has been saved, and no club account was created." with Keep editing and Discard (danger).',
    'Offline (useAdminConnectivity), Create club sends nothing and shows ADMIN_OFFLINE_ERROR on the review, keeping every value.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'SHEETS.addClub; ACT.openAddClub / addReview / addEdit / addCreate',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: ['Sheet', 'AddClubForm', 'AddClubReview', 'SheetSteps', 'Toaster'],
} satisfies ComponentMeta
