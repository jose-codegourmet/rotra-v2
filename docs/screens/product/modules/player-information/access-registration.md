# Player sign-in, registration claim, and password recovery

**Surfaces:** `P-LOGIN`, `P-INVITE`, `P-JOIN-CLUB`, `P-JOIN-SESSION`, `P-GOOGLE-LINK`, `P-GOOGLE-REQUIRED`, `P-CLAIM`, `P-CLAIM-STATUS`, `P-FORGOT`, `P-RESET`.

> **Changed November 16, 2026 ([D-2026-11-16-01](../../../../mvp/decisions.md#d-2026-11-16-01)):** Google sign-in is mandatory. The Google sections below replace the email + password registration and claim forms for new players; the email + password sign-in stays for existing password players until the deadline. Mockup log: [2026-11-16-player-google-sign-in](../../../../mockup-changes/2026-11-16-player-google-sign-in.md).

**Source:** [identity rules](../../../../business_logic/product/player-information/modules/identity/README.md).

**Feature flag (November 18, 2026, [D-2026-11-18-01](../../../../mvp/decisions.md#d-2026-11-18-01)):** every Google control and surface on this page (**Continue with Google**, the No Google account sheet, `P-INVITE`, `P-JOIN-CLUB`, `P-JOIN-SESSION`, `P-GOOGLE-LINK`, `P-GOOGLE-REQUIRED`) shows only while the platform feature flag `player_google_sign_in` is on. It starts off; while off, these screens stay as they are in the app today (email + password).

## P-LOGIN — Google, then email plus password

Order: logo and "Your player profile.", "Sign in", a context notice when the player came from an invite ("Sign in to join <club>." / "Sign in to request a spot in <session>."), **Continue with Google** (pending: "Waiting for Google…"), a divider "Signed up with a password?", "Sign in with your email and password once, then connect Google. Google sign-in is required from <deadline>.", then the Email, Password (with **Forgot password?** beside its label) and **Sign in** controls described below. Footer: "New to ROTRA? Create your account from your club's invite link or a session invite. You don't need an account to view profiles or the leaderboard."

Under the card, outside it, one small centred muted line: "By continuing you agree to the Terms of Service and Privacy Policy." The two names link to `/terms` and `/privacy` ([legal pages](legal.md), [D-2026-11-17-01](../../../../mvp/decisions.md#d-2026-11-17-01)).

A Google account with no ROTRA account (not connected, no matching email) shows a warn notice: "This Google account isn't connected to ROTRA. No ROTRA account uses or is connected to <email>. Already a ROTRA player? Sign in below with your email and password, then connect this Google account. We'll ask you right after you sign in. New to ROTRA? Open your club's invite link or a session invite to create your account." After that password sign-in the announcement offers **Connect <that email>**. A Google email equal to a password account's email opens P-GOOGLE-LINK at `/connect-google` (the pick is held in the app, never in the URL). Google here never creates an account. **Invite context in the app:** an invite page links to `/login?returnTo=<invite route>` (`/register/<clubId>`, with `?session=<slug>&invite=<code>` or `&k=<code>`); the notice names the club or session from that route, and the same route is where the player returns after signing in (otherwise their profile). Offline: "You're offline. Signing in needs an internet connection."

### Email plus password (existing password players)

Public profiles/leaderboard do not require login. Sign-in is needed for own-profile editing/privacy and account requests.

Controls (prototype layout in the [module README](README.md#reference-prototype)): one **Email** input (email keyboard, hint "The email you registered with."), Password, show/hide password, Sign in, Forgot password. Required-field errors identify missing input; a non-email value gets "Enter an email address, like name@example.com."; credential failures avoid exposing private account data. The prototype-only sample hint and "Any password works" placeholder never show against real accounts.

**Decided 2026-11-07 (#244), changed 2026-11-08:** the account is keyed by email + password and players sign in with their email only; a phone number is not accepted here (no SMS). A failed sign-in shows one generic credential error ("That email and password don't match. Check them and try again.") that never reveals whether the email exists.

The development mock matches the approved sign-in reference, including the sample phone/email hint
and any-password placeholder. A claimed fictional account must match; this is not real authentication
or email delivery.

No Facebook/social sign-in and no club username login on this form. Existing unclaimed profiles use their club-issued claim link. Registration from a club link, a session link or the Admin link is described below (#490, extended by [D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06)); matching contacts never create a duplicate profile.

Loading disables duplicate submission. Network failure preserves input and offers retry. Offline cannot establish a new authenticated session; cached public content is a separate read state. Success returns to the intended permitted destination or own profile; final routing is implementation work.

## P-INVITE — Club, session and Admin invite landings

`/register/[clubId]`, `/register/[clubId]?session=<slug>&invite=<code>`, `/register`. An invite card, then a card "New to ROTRA?" with **Continue with Google**, **I don't have a Google account** (the No Google account sheet), "ROTRA accounts sign in with Google. You don't need a password, and you add your mobile number next.", a divider "Already on ROTRA?" and **Sign in to join** / **Sign in to continue** / **Sign in to your account** (P-LOGIN with the context notice, then P-JOIN-CLUB or P-JOIN-SESSION).

| Link | Invite card |
|---|---|
| Club | Label "Club invite", club avatar, "Join <club>", chips city and "<n> members", "You're added to <club>'s saved players. The club can put you in its sessions and record your games. You can leave any time from the club page." |
| Session | Label "Session invite", the inviter's avatar (or the club's), "<inviter> invites you to play" (or "You're invited to play"), a date block, session title, club, "<day> · <time>", chips "Join requests open" and "Invited by <name>", "The Queue Master confirms who plays. Signing up doesn't reserve a spot." |
| Admin | Label "ROTRA registration", "Create your ROTRA account", "Your player profile, player ID and game history in one place." |

After Google: the registration form in Google mode. "Finish registering", "Your Google account is connected. Add your mobile number to finish. Your full name shows to signed-in ROTRA players on sessions you join.", **← Other ways to sign up**. Contact section: "Signs in with" and the Google row (name, email, **Email confirmed** chip, "This becomes your ROTRA email. Never shown publicly."), then Phone number (hint "Your mobile number. It is never shown publicly."), the Admin link's City or province, and About you. No email or password fields. CTA **Create account** ("Creating…"). Success is the existing Registration complete page, plus "You sign in with Google (<email>)." and the Verified chip. A Google email that clubs already saved as an unclaimed player claims that record ([D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04), [log](../../../../mockup-changes/2026-11-16-player-unclaimed-identity.md); this replaces the error "A club already made a ROTRA profile with this email. Ask the club for your registration link…"): see **Registering with an email clubs already saved** below. A Google email already on an account: P-GOOGLE-LINK (or straight to the join step when Google is already connected).

### Registering with an email clubs already saved

[D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04), [log](../../../../mockup-changes/2026-11-16-player-unclaimed-identity.md). The email is the key, not the phone. The person keeps the RTR ID the unclaimed record already has, and every club's record with that email joins the account with its games.

- **One club saved the email:** no dialog. The Finish registering form opens in Google mode with that club's details filled in and a notice: "**<Club> already saved a profile with this email.** Its details are filled in below. Your player ID stays <RTR ID> and your games carry over." Success is the P-CLAIM "Registration complete" page.
- **More than one club saved the email:** a dialog, **Which identity is correct?** "Two clubs saved a profile with **<email>**. Pick the one that's right. It becomes your starting profile, and you can change it after." One card per club, in the share dialog's carousel (one horizontal strip to drag or swipe, the card in view always centred with the next one peeking in, a fade on a side with more cards, dots under it). Each card has the club's logo and name on top and lists everything the club saved (Level, Picture, masked Phone, Playing since, Playing style, Links, Saved, Played here; "Not added" when empty). On the card: the club name, that club's picture, name, nickname in quotes (or "No nickname") and level chip. Tapping a card picks it; there is no separate confirm button. Under the cards: "Your player ID stays <RTR ID>. Every club's record with this email joins your account with its games, whichever you pick." Footer **Cancel** (back to the invite page, nothing created).
- After a pick: the Finish registering form in Google mode, name and nickname filled from the picked card, with the notice "You picked **<Club>**'s version of you as your starting profile. Change anything that's wrong. Your player ID stays <RTR ID>." No City or province field (the RTR ID already exists). Registration complete then shows "Your records from <Club> and <Club> are now on your account, with their games." and "Your player ID stays <RTR ID>."
- Mock behaviour (owner answers for #925): the Google email on the Google path and the typed ROTRA email on the email-and-password path both claim the record. A pick prefills the name, nickname, picture and level only. Phone linking on registration is unchanged. *Code:* `apps/player/.../register/[clubId]/_components/google-invite/GoogleInvite.tsx` (picker, notices, `identityRecordId`) and `packages/ui/src/components/account-link-status` (`joinedClubs`). Real mode is P15.8. The email-and-password form's "already uses this phone number or email" check below is unchanged.

## P-JOIN-CLUB — Signed-in player on a club invite

The club invite card, then a card "Signed in as <name>" with **Join <club>** (toast "You joined <club>") and **Not now**. Already a member: notice "You're already in <club>." and **Go to my profile**.

## P-JOIN-SESSION — Signed-in player on a session invite

The session invite card, then "Signed in as <name>", "Your request to join is ready to send on the session page. The Queue Master sees that <inviter> invited you.", **Continue to request to join** (opens the Queue session page `/s/<slug>?join=1&invite=<code>`) and **Not now**. Own invite: "This is your own invite. Share it with the person you want to bring." Already confirmed: "You're already in <session>."; waitlisted: "You're already on the waitlist for <session>."; both with **Go to my profile**. A session invite the player already sent a request on (a state the prototype doesn't have) shows the plain ready state; the Queue session page then shows the pending request. A signed-in player confirmed for a session at a club they aren't in does not become one of that club's saved players ([owner, November 18, 2026](../../../../mvp/decisions.md#d-2026-11-16-01)). A signed-in player on `/register` (the Admin link) goes to their own profile.

## P-GOOGLE-LINK — Connect Google to a password account

Shown when a Google account with the same email as a password account is picked (sign-in or invite). "Connect Google to your account?", "You already have a ROTRA account with this email. You signed up with a password.", the player row (avatar, name, RTR ID), the Google row with **Same email**, "After this you can sign in with Google or with your password. Nothing else on your account changes. You can change your Google account in Privacy and contact.", **Connect Google and sign in** (toast "Google connected. You're signed in.") and **Use my password instead** (P-LOGIN with the email filled).

## P-GOOGLE-REQUIRED — After the deadline

`/connect-google` (with the flag off, or with nothing to connect, it sends the visitor to `/login`; a player who already has Google, or is before the deadline, goes to their profile). The deadline gate sends every other page except the leaderboard and the legal pages here. A signed-in player without Google after the deadline sees only this page (and the leaderboard): "Connect Google to continue", "Since <deadline>, every ROTRA player signs in with Google. Connect yours once and you're done. Your profile, games and rank stay the same.", the player row, **Connect <tried email>** when they had tried one, **Connect Google** / **Use another Google account**, **I don't have a Google account**, **Sign out**.

## ROTRA announcement band and the No Google account sheet

A yellow band under the top bar on every page while the signed-in player isn't verified ([D-2026-11-16-02](../../../../mvp/decisions.md#d-2026-11-16-02)): label "ROTRA announcement", "Verify your ROTRA account by <deadline>. Connect Google, have your phone on file, and use your Google email as your ROTRA email. n of 3 done. Your profile, games and rank stay the same.", the next step's button (**Connect Google**, **Connect <tried email>** + **Use another Google account**, or **Finish verification**), **I don't have a Google account** or **See what's left**, and **Remind me later** (hides it until the next sign-in; not offered after the deadline, when the bottom border is thicker). Colours: `--ann-bg`, `--ann-border`, `--ann-tag`.

The band is shown while `player_google_sign_in` is on and is hidden on `/connect-google`. A player sent there from Verification returns to Verification after connecting Google.

The **No Google account?** sheet: "You don't need Gmail. Google lets you make a free account with the email you already use." Steps: open accounts.google.com/signup; choose **Use my current email address instead**; enter the code Google sends and set a Google password; come back and tap **Continue with Google**. "Still stuck? Ask your club or contact ROTRA. Nothing on your profile is lost while you sort it out." **Got it**.

## P-CLAIM — Complete a club-created profile

**Email, not phone ([D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04)):** the **Is this you?** card shows Player ID and a masked **Email** ("j•••••@example.com"), no longer a masked phone; the record is found by its email. A typable phone's hint is "This profile has no phone yet. Add your mobile number."

**Google (November 16, 2026):** after **Is this you?**, the step "Connect your Google account" ("ROTRA players sign in with Google. Connect yours to finish registering.") with **Continue with Google** and **I don't have a Google account**. The form then shows the Google row in place of Email, Password and Confirm password, with **← Use another Google account**; success says "Sign in from now on with Google (<email>)." A Google email already on another account: "<email> is already on another ROTRA account. Pick another Google account or set a password." The table below still describes the other fields.

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

For an account that signs in with Google, the acknowledgement is instead: "<email> signs in with Google and has no password. Go back and choose Continue with Google." (November 16, 2026).


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
