# Admin player detail shows verification checks and the Admin override

Status: TICKETED — #912
Date: 2026-11-18
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › Full profile › Overview › Verification
Route: /admin/players/p1
Screen ID: A-PLAYER-DETAIL
Artifact: https://rotra-admin-verification-889.exuberantwaffle5.chatgpt.site
Components: card, verification-step, verification-status-chip, confirm-sheet, textarea, button, toaster
Supersedes: none
Superseded by: none

## What changed

- Registered player detail shows a **Verification** card directly below **Account**. The title and current status chip share a row. Three numbered checks follow, with a check icon in place of the number when complete. All three are visible while the override is active.
- The card shows one action. The primary **Set Verified by Admin** sets the override; the secondary **Clear override** returns to the automatic status. Each opens a confirmation sheet with player name, RTR ID, status before and after, and a required reason.
- A successful save updates the card in place and adds the action with the trimmed reason, Admin and timestamp to **Activity** › **Record of actions**.

## Why

- The owner decided in [#907](https://github.com/jose-codegourmet/rotra-v2/issues/907#issuecomment-6971444654): “Admin can set Verified by Admin or clear the override to return to automatic checks.” Both actions require an audited reason. The card shows the status and all three checks. [D-2026-11-16-02](../mvp/decisions.md#d-2026-11-16-02)

## Like for like

- Compare at 375 px and 1280 px, dark and light. The card follows **Account** in the stacked mobile layout and shares its column on desktop. The existing sheet is bottom-docked on mobile and centered on desktop.
- States: automatic 0, 1, 2, and 3 of 3; no phone; Google and ROTRA emails differ with and without a waiting contact-change request; Verified by Admin with all check rows present; clear returns to the derived status, including Verified when all three checks pass. Unclaimed player detail omits the card.
- Interaction states: hover and keyboard focus on the actions; blank or whitespace reason focuses the invalid field; pending shows a spinner and blocks duplicate submits and dismissal; offline or failed write preserves the entered reason; retry after a failed write; cancel, Close, backdrop or Escape returns focus to the card action; success shows a toast and returns focus to the new card action. Long email addresses and audit reasons wrap.
- Copy
  - Card heading: “Verification”. Status: “Not verified · N of 3”, “Verified”, “Verified by Admin”.
  - “Google account” — “Connected · <Google email>” or “Not connected”.
  - “Mobile number” — “On file · <masked phone>” or “Not on file”.
  - “ROTRA email matches Google” — “Both are <email>”, “Google must be connected first.”, or “ROTRA email: <ROTRA email>. Google email: <Google email>.” Missing ROTRA email displays “Not given”. A waiting request to use the Google email adds “Change sent for Admin review”.
  - Set action and primary confirmation: “Set Verified by Admin”. Sheet title: “Set Verified by Admin?” Consequence: “ROTRA will mark this account verified through Admin.”
  - Clear action and primary confirmation: “Clear override”. Sheet title: “Clear override?” Consequence: “ROTRA will determine verification from the three automatic checks.”
  - Both sheets: “Player”, “RTR ID”, “Current status”, “After saving”, “Reason for the change”, “Required. Saved in the record of actions.”, “Cancel”. Close button accessible name: “Close”. Step announcements: “Step N.” and “Done.” for completed steps.
  - Validation: “Enter a reason.” Pending: “Saving…”. Errors: “Changes could not be saved” and “You're offline, so nothing was saved. Try again once you're connected.”
  - Toasts: “Verified by Admin saved” and “Verification override cleared”.
  - Audit: “Set <name> to Verified by Admin. Reason: <reason>” and “Cleared Verified by Admin for <name>. Reason: <reason>”.
  - Prototype-only failure switch: “Next verification save fails” and “The verification status stays the same and the reason is kept in the form.”
- Tokens: existing card, control and validation tokens; existing success/warning chips and the Player verification step colors in both themes.
- Known differences: none.

## Reuse plan

- Reuses as is: `Card`, `VerificationStatusChip`, `VerificationStep`, `Textarea`, `Button`, `Toaster`, and the existing Activity list. Compose the Verification section beside `AdminPlayerIdentityCard` and Account. `VerificationStep` accepts the matching-request status chip through its existing slot.
- Extends: use `ConfirmSheet` with its existing summary, consequence, confirmation and error props and a form-content slot for the required reason if needed. Keep the same confirmation layout and focus behavior.
- New: if needed for the app's composition, an Admin verification card composed from `Card` and the shared verification steps and chip. The Player `VerificationCard` has role-specific deadline and next-step copy and hides its steps under the override.
- Shares work with: [Player account verification](2026-11-16-player-account-verification.md) through the status chip, check rows and derived state.

## Docs updated

- Business logic: [Player identity](../business_logic/product/player-information/modules/identity/README.md#account-verification) and [Admin player management](../business_logic/product/admin/modules/player-management/README.md#account-verification-907-owner-decision-november-18-2026) describe the eligible account, required reason, set/clear behavior, and action record.
- Database design: [Player identity](../database_design/product/player-information/modules/identity.md#account-verification-d-2026-11-16-02) and [Admin audit](../database_design/product/admin/modules/configuration-requests.md#admin_audit_events) describe the nullable override and required reason in audit metadata.
- Screen docs: [Admin Player detail](../screens/product/modules/admin/players-requests.md#verification) describes placement, copy, three checks and the set/clear flow.

## Real app work

- [#912](https://github.com/jose-codegourmet/rotra-v2/issues/912) wires the mock detail read and set/clear mutation to Player detail and the existing Activity feed. The Admin and Player queries use the same verification read model. The apps have separate in-memory mock stores when run on their own origins, so a change cannot be checked across both browser apps in mock mode. The #912 implementation awaits batch verification.

## Prototype fixtures

- Open **Players**, search for the name, open the result's Quick view, then choose **Full profile**. Use **Overview** and scroll below **Account**.
- **Miguel Santos** (p1) starts at 1 of 3. Set and clear his override. **Bea Castillo** (p2) starts Verified, so clearing her override restores Verified. **Kat Lim** (p4) has a mismatched Google email and a waiting request. **Enzo Navarro** (p5) has a mismatch without a request. **Marco Lopez** (p16) starts at 0 of 3. **Andi Cruz** (p20) has matching emails and a missing phone. **Jomar dela Cruz** (p3) is unclaimed.
- For a simulated write failure, enable **Prototype** › **Next verification save fails** before confirming. **Prototype** › **Offline** gives the offline error on confirm. If a locally saved demo predates these fixtures, **Prototype** › **Reset demo data** loads the current fixtures.
