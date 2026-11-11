# Flow: create, claim, and recover a player account

**Last verified:** 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

## Club entry to profile

1. The operator adds/confirms a player and verifies their identity in person.
2. Without a phone, retain a saved club guest; bypass profile creation.
3. With a phone, keep the entry as the club's own unclaimed profile.
4. When the entry syncs, a phone that matches a **registered** player links to that player. Otherwise it stays an unclaimed profile in this club only: no RTR ID, never found by another club ([D-2026-11-11-03](../../../../../../mvp/decisions.md#d-2026-11-11-03)).
5. When the person registers, they get their permanent RTR ID, and every club's unclaimed record with the same phone links to the account automatically.

Profile creation does not bypass the valid-session performance gate. After a returning guest's identity is confirmed, include earlier valid guest games in personal history and ranking under the existing eligibility/window rules, without duplicating games or changing permanent outcomes. The evidence and process for confirming a historical guest link remain to be specified.

## Claim

1. The operator supplies the registration link for that profile. It is valid 7 days and single use; reissuing invalidates the previous link (decided 2026-11-07, #244).
2. The player reviews preset name/nickname/phone/social details.
3. Require phone and email, collect optional personal details, and set a password. If the phone or email already belongs to another account, block and show the contact-support route; never merge.
4. The player can sign in using phone or email plus password. The auth account is keyed by email; a phone is looked up to that email on the server.
5. The player may hide their phone from club operators and use player ID/QR for future identification.

## Recover or change contact information

- Forgotten password: submit the account email for Admin review; no automatic email. ROTRA Admin verifies ownership and provides a reset link; the player chooses their own password (#491).
- Phone/email change: request help from the platform owner; Admin must manually approve.
- Public rank and match history are not player-editable account fields.

Email verification on claim and contact-change verification/enforcement are explicitly unresolved; no SMS or social-auth requirement is implied.
