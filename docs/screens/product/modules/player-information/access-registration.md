# Player sign-in, registration claim, and password recovery

**Surfaces:** `P-LOGIN`, `P-CLAIM`, `P-CLAIM-STATUS`, `P-FORGOT`, `P-RESET`.

**Source:** [identity rules](../../../../business_logic/product/player-information/modules/identity/README.md).

## P-LOGIN — Phone/email plus password

Public profiles/leaderboard do not require login. Sign-in is needed for own-profile editing/privacy and account requests.

Controls (prototype layout in the [module README](README.md#reference-prototype); the field groups phone digits as they're typed, display only): one **Phone number or email** input, Password, show/hide password, Sign in, Forgot password. Required-field errors identify missing input; credential failures avoid exposing private account data. Normalize through the approved identity rules rather than guessing a country from a partial number.

**Decided 2026-11-07 (#244):** the account is keyed by email + password. A phone entered here is a login identifier only: the server normalizes it, looks up the linked account's email and signs in with email + password (no SMS). A failed sign-in shows one generic credential error that never reveals whether the phone or email exists. A player who hides their phone from clubs can still sign in with it.

The development mock matches the approved sign-in reference, including the sample phone/email hint
and any-password placeholder. A claimed fictional account must match; this is not real authentication
or email delivery.

No Facebook/social sign-in and no club username login on this form. Registration is through the club-issued claim link; do not offer an unagreed unrestricted account-creation path that duplicates existing unclaimed profiles.

Loading disables duplicate submission. Network failure preserves input and offers retry. Offline cannot establish a new authenticated session; cached public content is a separate read state. Success returns to the intended permitted destination or own profile; final routing is implementation work.

## P-CLAIM — Complete a club-created profile

Entry: operator-issued registration link tied to a specific existing identity. Show enough of that identity for the recipient to confirm it is their profile before creating credentials. A name/ID is not by itself a reusable claim credential.

| Field | Requirement and ownership |
|---|---|
| Full name | Operator may preset; player completes/reviews personal identity |
| Nickname | Operator may preset; optional until a stronger rule is agreed |
| Phone number | Required; preset from linked identity where available; not freely replaceable through this form |
| Email | Required; collect if missing; existing identity conflicts require resolution |
| Password | Required to establish login; complexity policy is still open (#244) |
| Confirm password | Proposed typo-prevention field; match the chosen password |
| Facebook link/identity | Optional social field, may be preset; not login |
| Instagram, YouTube, LinkedIn | Optional links |
| Experience | Optional years/months of play; not automatic rating credit |
| Playing-style details | Optional supported fields; exact vocabulary/options remain undecided |

Do not invent age, tournament wins, gear, six-dimension self-rating, or other old onboarding requirements. A proposed password visibility/match control does not set a new minimum password length without the auth specification.

A wrong preset phone cannot be changed to claim a different person through this link. **Decided 2026-11-07 (#244):** if the phone or email already belongs to another account, block the claim and show the contact-support route; never merge silently. What support then does (mistaken/duplicate links, permanent relink) is open. An RTR ID or name alone never claims an account.

CTA **Complete registration**. Pending prevents duplicates. Do not say complete until profile and authentication account are consistently ready. If account creation partially succeeds, resume/recover the same claim rather than create another identity.

No SMS step or Facebook authorization is part of the agreed flow. Link lifetime is decided (2026-11-07, #244): valid 7 days, single use. Email verification on claim is explicitly pending.

## P-CLAIM-STATUS — Link and provisioning outcomes

| State | Screen behavior |
|---|---|
| Valid, unclaimed | Show P-CLAIM with correct preset data |
| Already claimed/consumed | Offer sign-in/recovery for the existing identity; do not issue another account |
| Invalid/expired/revoked | Explain the link cannot be used; direct to operator/platform assistance without exposing private contact data. Links expire after 7 days; a reissued link revokes the previous one |
| Wrong profile recognized by recipient | Stop claiming and direct to assistance; no merge-by-name |
| Phone or email belongs to another account | Block the claim and show the contact-support route; never merge (decided 2026-11-07, #244) |
| Provisioning still processing | Show pending state/retry status check; avoid duplicate submission |
| Offline | Require connectivity; preserve unsent form values appropriately without claiming success |

The club (Queue Master) can reissue the link, which invalidates the previous one (decided 2026-11-07, #244). Exact wording and the replacement-link delivery method are still open. Operator role remains initial entry; normal forgotten-password recovery is by email.

## P-FORGOT — Email recovery request

Explain that reset instructions are sent to the account's email. Proposed request input is email, with a generic acknowledgement regardless of account existence. Recovery stays email-only (decided 2026-11-07, #244); if a phone-based lookup is ever offered, the destination remains email and private-email disclosure must still be avoided.

States: empty/invalid input, sending, generic sent acknowledgement, retryable service failure with safe wording. Resend limits/cooldowns come from actual service policy, not hardcoded screen assumptions. Do not route routine resets to a club operator.

> MVP: email recovery replaced by manual Admin-issued reset links under [D-2026-11-07-01](../../../../mvp/decisions.md#d-2026-11-07-01); P-FORGOT directs players to support. Prototype update pending a mockup change.

## P-RESET — New password from recovery link

Validate the recovery link/session before showing a usable form. Inputs: new password and proposed confirmation, password visibility controls, Save password. Successful completion directs to sign-in with a clear confirmation. Exact session-signout/provider behavior is implementation-dependent.

Expired/invalid/used link shows Request another reset. Failure preserves unsaved password fields only as appropriate for the active secure form; never logs or displays the password in support details. No Admin or operator sees the new password.

## Acceptance examples

- Both phone and email can identify the same account at login; the account itself is keyed by email.
- Registration cannot complete without phone and email, but social links remain optional.
- A claim link cannot silently create a second profile for a phone already linked.
- Password recovery uses email and does not require the original club operator.
