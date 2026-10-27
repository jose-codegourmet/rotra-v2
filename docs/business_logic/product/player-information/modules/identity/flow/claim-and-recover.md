# Flow: create, claim, and recover a player account

## Club entry to profile

1. The operator adds/confirms a player and verifies their identity in person.
2. Without a phone, retain a saved club guest; bypass profile creation.
3. With a phone, match to an existing identity or prepare a new unclaimed profile.
4. At eligible valid finalization/sync, create/update the profile. First profile sync assigns the permanent RTR ID using the creating club's founding city and sync date.
5. An existing profile is reused across clubs rather than duplicated by name.

The exact timing of new-profile allocation during intermediate session sync versus final Session done is an open decision; it must not bypass the agreed valid-session performance gate.

## Claim

1. The operator supplies the registration link for that profile.
2. The player reviews preset name/nickname/phone/social details.
3. Require phone and email, collect optional personal details, and set a password.
4. The player can sign in using phone or email plus password.
5. The player may hide their phone from club operators and use player ID/QR for future identification.

## Recover or change contact information

- Forgotten password: send recovery email; the operator does not issue replacement credentials.
- Phone/email change: request help from the platform owner; Admin must manually approve.
- Public rank and match history are not player-editable account fields.

Verification steps for email, claiming, and contact changes are explicitly unresolved; no SMS or social-auth requirement is implied.
