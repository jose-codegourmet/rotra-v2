# Guest invitations open registration

Status: ALREADY A TICKET — #490
Date: 2026-11-08
App: queue, player
Mockup: apps/mockup/queue-app/rotra-queue.html › guest profile and Invite; apps/mockup/player-app/rotra-player.html › guest registration (developer menu)

## What changed
- Request to join now directs new players to ask the club for a registration invite.
- Copy and Share open registration, with copy explaining that the guest record stays unlinked.
- Reuse the registration form with empty details and required phone/email/password.
- A matching contact asks whether the account is theirs: Yes requires sign-in/recovery; No allows correction or contacting ROTRA. Unclaimed profiles need their existing claim link.

## Why
- #490 and owner decisions in its implementation chat on November 8, 2026.
- Registering is separate from accepting a later guest-link invitation. Matching a name or contact never links guest history.

## Docs updated
- Business logic: Player identity and Queue players — guest registration and matching-contact actions.
- Database design: Player identity — reuse existing profile/account/claim staging without club-player linkage.
- Screens: Player access and Queue players — registration entry, match prompt and invite copy.

## Real app work
- #490 implements /register/[clubId], using the inviting club for existing RTR ID allocation only; guest identity is absent from this URL.
- Keep existing /claim/[token] behavior for unclaimed profiles. No separate guest-link acceptance flow is implemented here.
