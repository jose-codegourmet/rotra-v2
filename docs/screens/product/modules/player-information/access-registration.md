# Player sign-in, registration claim, and password recovery

**Surfaces:** `P-LOGIN`, `P-CLAIM`, `P-CLAIM-STATUS`, `P-FORGOT`, `P-RESET`.

**Source:** [identity rules](../../../../business_logic/product/player-information/modules/identity/README.md).

## P-LOGIN — Phone/email plus password

Public profiles/leaderboard do not require login. Sign-in is needed for own-profile editing/privacy and account requests.

Controls (prototype layout in the [module README](README.md#reference-prototype); the field groups phone digits as they're typed, display only): one **Phone number or email** input, Password, show/hide password, Sign in, Forgot password. Required-field errors identify missing input; credential failures avoid exposing private account data. Normalize through the approved identity rules rather than guessing a country from a partial number.

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
| Password | Required to establish login; complexity policy must come from the actual account specification |
| Confirm password | Proposed typo-prevention field; match the chosen password |
| Facebook link/identity | Optional social field, may be preset; not login |
| Instagram, YouTube, LinkedIn | Optional links |
| Experience | Optional years/months of play; not automatic rating credit |
| Playing-style details | Optional supported fields; exact vocabulary/options remain undecided |

Do not invent age, tournament wins, gear, six-dimension self-rating, or other old onboarding requirements. A proposed password visibility/match control does not set a new minimum password length without the auth specification.

A wrong preset phone cannot be changed to claim a different person through this link. Show a route to seek identity/contact assistance; exact pre-claim correction process is open. Same for an email belonging to a different account.

CTA **Complete registration**. Pending prevents duplicates. Do not say complete until profile and authentication account are consistently ready. If account creation partially succeeds, resume/recover the same claim rather than create another identity.

No SMS step or Facebook authorization is part of the agreed flow. Email verification and token-lifetime policy are explicitly pending.

## P-CLAIM-STATUS — Link and provisioning outcomes

| State | Screen behavior |
|---|---|
| Valid, unclaimed | Show P-CLAIM with correct preset data |
| Already claimed/consumed | Offer sign-in/recovery for the existing identity; do not issue another account |
| Invalid/expired/revoked | Explain the link cannot be used; direct to operator/platform assistance without exposing private contact data |
| Wrong profile recognized by recipient | Stop claiming and direct to assistance; no merge-by-name |
| Provisioning still processing | Show pending state/retry status check; avoid duplicate submission |
| Offline | Require connectivity; preserve unsent form values appropriately without claiming success |

Exact wording and replacement-link delivery depend on the account policy. Operator role remains initial entry; normal forgotten-password recovery is by email.

## P-FORGOT — Email recovery request

Explain that reset instructions are sent to the account's email. Proposed request input is email, with a generic acknowledgement regardless of account existence. If the final account design allows phone-based lookup for recovery, the destination remains email and private-email disclosure must still be avoided.

States: empty/invalid input, sending, generic sent acknowledgement, retryable service failure with safe wording. Resend limits/cooldowns come from actual service policy, not hardcoded screen assumptions. Do not route routine resets to a club operator.

## P-RESET — New password from recovery link

Validate the recovery link/session before showing a usable form. Inputs: new password and proposed confirmation, password visibility controls, Save password. Successful completion directs to sign-in with a clear confirmation. Exact session-signout/provider behavior is implementation-dependent.

Expired/invalid/used link shows Request another reset. Failure preserves unsaved password fields only as appropriate for the active secure form; never logs or displays the password in support details. No Admin or operator sees the new password.

## Acceptance examples

- Both phone and email can identify the same account at login.
- Registration cannot complete without phone and email, but social links remain optional.
- A claim link cannot silently create a second profile for a phone already linked.
- Password recovery uses email and does not require the original club operator.
