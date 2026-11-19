# Player app: account verification page (Google, phone, matching email) with an Admin override

Status: IN MOCK APP — #889
Date: 2026-11-16
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewVerify, verifyCard, verifyChip, verifyOf, gRequiredBand, viewProfile (status chip, Verification button), privatePanel
Route: /player/profile/verification
Screen ID: P-VERIFICATION
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: verification-card, verification-step, status chip, announcement-band, page-head
Supersedes: none
Superseded by: none

## What changed
- **P-VERIFICATION (new page, its own profile setting).** Back to My profile, title "Verification", "Show that this ROTRA account is really yours. Only you and ROTRA Admin see these details."
  - **Your status** card: chip "Not verified · n of 3" (warn), "Verified" or "Verified by Admin" (ok); "Finish these by <deadline>. n of 3 done." and a progress bar.
  - Three steps, each with a numbered circle that becomes a check when done:
    1. **Connect your Google account** — "Connected · <google email>" or **Connect Google**.
    2. **Add your mobile number** — "On your account · <masked phone>" or **Add phone number** (opens the contact-change request on Phone).
    3. **Use your Google email as your ROTRA email** — "Both are <email>"; "Connect Google first."; or "Your ROTRA email is X, but your Google account is Y." with **Change my ROTRA email to Y** (a contact-change request, prefilled) and **Connect the Google account for X**. While that request waits: chip "Change sent for Admin review".
  - Verified by Admin: the steps are hidden; notice "ROTRA Admin verified your account. You don't need to do anything else."
  - "Can't finish a step? Contact ROTRA. Admin can verify your account by hand." and a **Why verify?** card.
- **Own profile.** A status chip next to "This is you" (opens the page) and a **Verification** button after My player ID; **Verification** also in the "Your account" panel.
- **Announcement band text.** "Verify your ROTRA account by <deadline>. Connect Google, have your phone on file, and use your Google email as your ROTRA email. n of 3 done." with the next step's button, then **I don't have a Google account** or **See what's left**, and **Remind me later** (until the deadline). Gone once verified.
- **Notifications.** The pinned announcement follows the progress; "ROTRA Admin verified your account" when Admin overrides.
- **Registration done.** New Google accounts show the Verified chip with "Google, phone and email are all set."
- Prototype panel: "Verification (Migs)" Automatic checks / Admin: Verified by Admin, and Remove his phone.

## Why
- Owner, November 16, 2026: "I think there should be a KYC or a verification process … fill up google account, fill up phone number, fill up email (should match google account) … but the admin has a way to bypass that too by updating the player status".
- Owner: "I think these KYC things should be a different setting in user profile".
- Decision: [D-2026-11-16-02](../mvp/decisions/2026-11-16.md#d-2026-11-16-02).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: 0, 1, 2 and 3 of 3; email mismatch with and without a pending request; no phone; Verified by Admin; signed out (sign-in first, then back).
- Copy: as listed above, exactly as the mockup has it.
- Tokens: none new (status chips use the existing ok and warn chips; the bar uses `--accent` on `--elev`).
- Known differences: none.

## Reuse plan
- Reuses as is: chip, notice, page-head with back button, the contact-change request sheet.
- New: verification-card with verification-step rows and a progress bar (nothing similar exists).
- Shares work with: [2026-11-16-player-google-sign-in](2026-11-16-player-google-sign-in.md) (announcement band), [2026-11-16-player-notifications](2026-11-16-player-notifications.md).

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — Account verification.
- Database design: docs/database_design/product/player-information/modules/identity.md — verification status and the Admin override.
- Screen docs: docs/screens/product/modules/player-information/identity-privacy.md — P-VERIFICATION.

## Real app work
- The verification page and chip in apps/player; a derived verification status in packages/db; the Admin override control in apps/admin (Players › player), which needs its own Admin mockup change first.

## Batch verification — 2026-11-18

Player and Admin screens checked at 375 px and 1280 px in dark and light themes against the canonical mockups. Local real-mode checks cover automatic status, pending email mismatch, required reason, set/clear, persisted reload, Activity audit reason, and failed-save reason retention. Screenshots were delivered in chat only. Google OAuth itself remains separate in #922.
