# Player sign-in, registration claim, and password recovery

**Surfaces:** `P-LOGIN`, `P-CLAIM`, `P-CLAIM-STATUS`, `P-FORGOT`, `P-RESET`.

**Source:** [identity rules](../../../../business_logic/product/player-information/modules/identity/README.md).

## P-LOGIN — Email plus password

Public profiles/leaderboard do not require login. Sign-in is needed for own-profile editing/privacy and account requests.

Controls (prototype layout in the [module README](README.md#reference-prototype)): one **Email** input (email keyboard, hint "The email you registered with."), Password, show/hide password, Sign in, Forgot password. Required-field errors identify missing input; a non-email value gets "Enter an email address, like name@example.com."; credential failures avoid exposing private account data. The prototype-only sample hint and "Any password works" placeholder never show against real accounts.

**Decided 2026-11-07 (#244), changed 2026-11-08:** the account is keyed by email + password and players sign in with their email only; a phone number is not accepted here (no SMS). A failed sign-in shows one generic credential error ("That email and password don't match. Check them and try again.") that never reveals whether the email exists.

The development mock matches the approved sign-in reference, including the sample phone/email hint
and any-password placeholder. A claimed fictional account must match; this is not real authentication
or email delivery.

No Facebook/social sign-in and no club username login on this form. Existing unclaimed profiles use their club-issued claim link. Registration from a club link, a session link or the Admin link is described below (#490, extended by [D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06)); matching contacts never create a duplicate profile.

Loading disables duplicate submission. Network failure preserves input and offers retry. Offline cannot establish a new authenticated session; cached public content is a separate read state. Success returns to the intended permitted destination or own profile; final routing is implementation work.

## P-CLAIM — Complete a club-created profile

Entry: operator-issued registration link tied to a specific existing identity. Show enough of that identity for the recipient to confirm it is their profile before creating credentials. A name/ID is not by itself a reusable claim credential.

| Field | Requirement and ownership |
|---|---|
| Full name | Operator may preset; player completes/reviews personal identity |
| Nickname | Operator may preset; optional until a stronger rule is agreed |
| Phone number | Required; preset from linked identity where available and then read-only; when the profile has none, a required typable field (not on another profile) |
| Email | Required; prefilled from what the club entered, editable; existing identity conflicts require resolution |
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

The club (Queue Master) can reissue the link, which invalidates the previous one (decided 2026-11-07, #244). Every field the club entered is prefilled and stays editable. Experience is Years + months and Playing since (month, year), linked. Exact wording and the replacement-link delivery method are still open. Operator role remains initial entry; normal forgotten-password recovery is reviewed by ROTRA Admin (#491).

## P-FORGOT — Admin-reviewed recovery request (#491)

Enter the email on the ROTRA account and choose **Request password reset**. The server creates a
private Admin review request, without emailing or generating a link. Pending duplicate addresses
reuse one request. The acknowledgement is identical for known and unknown addresses: **Request
received**. Contact ROTRA support through the usual channel to verify ownership; an Admin provides
the link after review. The club operator cannot reset the password. Offline/errors retain the input.

## P-RESET — New password from recovery link

The form opens without consuming the link; submit validates the Admin-issued digest and provider recovery token. Inputs: new password and proposed confirmation, password visibility controls, Save password. Successful completion directs to sign-in with a clear confirmation. Exact session-signout/provider behavior is implementation-dependent.

Expired/invalid/used link shows Request another reset. Failure preserves unsaved password fields only as appropriate for the active secure form; never logs or displays the password in support details. No Admin or operator sees the new password.

## Acceptance examples

- Only the account's email signs in; entering the player's phone number is rejected as not an email.
- Registration cannot complete without phone and email, but social links remain optional.
- A claim link cannot silently create a second profile for a phone already linked.
- Password recovery uses the account email for an Admin review request, without automatic email or club-owner access.


## Guest registration invitation — /register/[clubId] (#490)

Owner decisions, November 8, 2026: guest registration is separate from guest-record linking.
The existing ClaimForm starts empty (no identity preview) and asks for required name, phone,
email and password plus the existing optional personal fields. The invitation's club supplies
RTR ID allocation context only. ~~Intro: “Create your ROTRA account with your phone and email.
Your club guest record stays unlinked until you accept a separate linking invitation.”~~
**Superseded by [D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06):** the "stays unlinked" intro and the
"registration only from a club invitation" rule no longer apply. Intro now: “Create your ROTRA account with your phone and email.
Your full name shows to signed-in ROTRA players on sessions you join.”

Before creating a new account, a phone or email match shows: “A ROTRA account or profile already
uses this phone number or email. Is it yours?” No matched name, ID or contacts are disclosed.
**Yes, sign in** opens `/login`; **Recover account** opens `/forgot-password`; **No, edit my details**
keeps the form values and focuses the phone field. The note directs unclaimed-profile owners to
ask their club for a claim link, and other conflicts to correct their contacts or contact ROTRA.
No answer claims an account or links a guest. Existing contact uniqueness remains enforced.

Loading and invalid-club states precede the form. Pending disables submission; offline/service
errors preserve entries. Retries reuse the same registration attempt. Success shows the new Player
ID, confirms the guest record remains unlinked, and opens the signed-in player's own profile.
Copy invite link and Share in Queue use this same destination. No invitation is sent by ROTRA.

### Registration from club, session and Admin links (D-2026-11-09-06)

Mockup: `/player/register/[clubId]`, `/player/register/[clubId]?session=<slug>`, `/player/register`.

| Link | Context label | Extra field | Success |
|---|---|---|---|
| Club link | “Registration link from <club>” | none (the club's location is used) | “Welcome, <name>”, notice “You're now in <club>'s saved players.” |
| Session link | “Session link from <club> · <session title>” | none | Same, plus “Your request to join <session> is ready to send.” and **Back to the session** (to the Queue session page `/s/<slug>`) |
| Admin link (`/register`) | “ROTRA registration” | required **City or province** select (error “Pick your city or province.”, hint “Used in your player ID.”) | “Welcome, <name>”; no club notice |

The player is signed in right away; success shows the new player ID and **Go to my profile**. Spam limits, the email provider and server rules are not screen work.

**Email confirmation banner.** While the signed-in account has not confirmed its email, every page shows: “Confirm your email. We sent a link to <email>. Some actions wait until it's confirmed.” with **Resend email** (toast “Email sent again”). The prototype also has **Mark confirmed**; it is not part of the real app. A contact-change request is refused with “Confirm your email first.” until then.

**Join <club>? page** — a signed-in player opening `/register/[clubId]`: title “Join <club>?”, text “You're added to <club>'s saved players. The club can put you in its sessions and record your games. You can leave any time from your profile.”, buttons **Join <club>** (toast “You joined <club>”) and **Not now**. If the player is already in that club: notice “You're already in <club>.” with **Go to my profile**.
