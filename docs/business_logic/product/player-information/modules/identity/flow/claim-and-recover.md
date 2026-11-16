# Flow: create, claim, and recover a player account

**Last verified:** 2026-11-16 for club entry by email ([D-2026-11-16-04](../../../../../../mvp/decisions.md#d-2026-11-16-04)); 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

## Club entry to profile

1. The operator adds/confirms a player and verifies their identity in person.
2. Without an email, retain a saved club guest (a name only); bypass profile creation.
3. With an email, the entry is an unclaimed player ([D-2026-11-16-04](../../../../../../mvp/decisions.md#d-2026-11-16-04), replacing the phone rule of [D-2026-11-11-03](../../../../../../mvp/decisions.md#d-2026-11-11-03)).
4. When the entry syncs, an email that already belongs to a ROTRA player (registered or unclaimed) links the entry to that person and their RTR ID. Otherwise the person gets a new RTR ID. Each club keeps its own name, nickname, picture and level for an unclaimed player.
5. When the person registers, they keep that RTR ID, and every club's record under the email joins the account automatically. If more than one club saved the email, they pick one club's version as their starting profile.

Profile creation does not bypass the valid-session performance gate. Games on a record that joins an account count in personal history and ranking under the existing eligibility/window rules, without duplicating games or changing permanent outcomes. A guest's games join only after the club adds the guest's email.

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
