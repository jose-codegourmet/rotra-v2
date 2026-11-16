# Player app: unclaimed players are public, found by email, and pick an identity on registration

Status: NEW
Date: 2026-11-16
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewClaim, viewRegisterDone, googleDone, SHEETS.identity, SHEETS.profileCard, lbRow, viewBoard, viewProfile, Prototype panel
Route: /player/register (pick Paolo in the Google account picker), /player/claim/<token>, /player (leaderboard, #18 and #23)
Screen ID: P-CLAIM, P-LEADERBOARD, P-PUBLIC-PROFILE (registration from a link has no screen ID)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: profile-card, leaderboard-row, claim-form, chip, sheet, share-image-picker (carousel)
Supersedes: none
Superseded by: none

## What changed
- **Identity picker.** Registering with Google using an email that more than one club saved as an unclaimed player
  now opens a dialog, "Which identity is correct?", with one card per club (club name, picture, name, nickname,
  level). Tapping a card makes it the starting profile and opens Finish registering with that name and nickname
  filled in. Before: no such step.
- **One club saved the email.** Before: the error "A club already made a ROTRA profile with this email. Ask the club
  for your registration link so your games carry over." After: no dialog; Finish registering opens in Google mode
  with that club's details filled in (Jomar), and registration claims the record.
- **RTR ID and games.** After either path the person keeps the unclaimed record's RTR ID (no City or province field
  for the two-club case) and Registration complete says every club's record joined the account.
- **Email, not phone.** The "Is this you?" card showed a masked phone; it now shows the masked email. Phone hints no
  longer say the phone "identifies your ROTRA profile". The phone field itself stays.
- **Unclaimed players are public.** Two sample leaderboard players (#18 Nina Ocampo, Lahug Smash Club; #23, Mandaue
  Shuttle Society) are unclaimed: a "Not registered yet" chip on the leaderboard row, the profile dialog and the
  profile page; the dialog's About shows "Saved by" the club in place of "Registered in". A guest (name only) keeps
  the limited "no profile to show" card. Before: an opponent without an account was always that guest card.
- **Leaderboard rule copy.** "Who appears here" gains one line about unclaimed players.
- Ranking numbers and math are unchanged: two existing sample rows were marked, none added.

- **Owner artifact comment, same day:** the identity cards sit in the share dialog's carousel, not a stacked list: one horizontal strip, drag or swipe, scroll-snapping, a fade mask on a side when more cards are hidden that way, and dots under the strip. A card is still picked with one tap; a drag never counts as a tap. Reuses `.sh-dlg .sh-tiles`, `.sh-pick`, `.sh-car-nav` and the SHCAR handlers.
- **Owner artifact comments, same day (two more):** the card in view is always centred, also after a swipe, with the next card peeking in at the side (one card per swipe). Each card shows the club's logo and name on top, the club's picture, name and nickname for the person, then everything the club saved: Level, Picture, Phone (masked), Playing since, Playing style, Links, Saved (date) and Played here ("14 games in 6 sessions"). An empty value reads "Not added".

- **Owner artifact comment, same day (profile page of an unclaimed player):** the profile card on the left now shows the complete information under the name: the level chip and the standing chip ("#18 overall", or "Not on the leaderboard yet"), an **About** block (Saved by CLUB; Standing "#18 of 1,284 overall", or "No overall position yet. 7 of 10 standard matches in the last three months"), and the **Latest stats** block of the profile dialog (win rate, games, wins, losses for the year). The Clubs card lists the club that saved them instead of "No clubs yet." (`heroFacts`, `clubsOf`).

## Why
- Owner decision [D-2026-11-16-04](../mvp/decisions.md#d-2026-11-16-04), November 16, 2026. On claiming: "they get
  prompted to a dialog asking. which of the following identities are correct and is presented to them in a form of
  cards and they just pick which one". On being public: "thats the point of unclaimed. they get to be public. making
  sure that the real person must be eager enough to register so they can make it private".

- Owner artifact comment, November 16, 2026 (on "Which identity is correct?"): "please use the layout style with embla carousel and both sides will be masked similar to sharing share posts".
- Owner artifact comments, November 16, 2026: "the card should also show the logo and name of the club and put full information details"; "cards should always be centered even when they get swiped kinda like a tinder swipe card behavior".

- Owner artifact comment, November 16, 2026 (on Jomar dela Cruz's profile card): "show complete information with standings if applicable and stats too".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: identity dialog (two cards; one with a picture and nickname, one with initials and "No nickname"; hover and
  focus on a card; Cancel); Finish registering after a pick; Finish registering after a one-club email match;
  Registration complete with joined records; "Is this you?" with the masked email; leaderboard row with the chip
  (also in name search results); profile dialog and profile page of an unclaimed player; guest card unchanged.
- Copy:
  - Dialog title: "Which identity is correct?"
  - "Two clubs saved a profile with **<email>**. Pick the one that's right. It becomes your starting profile, and you can change it after."
  - Card: club name label, name, "“<nickname>”" or "No nickname", level chip.
  - "Your player ID stays <RTR ID>. Every club's record with this email joins your account with its games, whichever you pick."
  - "You picked **<Club>**'s version of you as your starting profile. Change anything that's wrong. Your player ID stays <RTR ID>."
  - "**Lahug Smash Club already saved a profile with this email.** Its details are filled in below. Your player ID stays <RTR ID> and your games carry over."
  - "Your records from <Club> and <Club> are now on your account, with their games."
  - "Your player ID stays <RTR ID>." (was "is", for these registrations only)
  - "Is this you?" card: "Email" + "j•••••@example.com" (was "Phone" + masked phone)
  - Phone hints: "Your mobile number. It is never shown publicly." and "This profile has no phone yet. Add your mobile number."
  - Chip: "Not registered yet"
  - Profile dialog: section "Unclaimed", "<Club> saved this player. This is the club's version of them, public until they register with ROTRA."; About row "Saved by" <Club>
  - Profile page: "**Not registered yet.** <Club> saved this player, so this is the club's version of them. The profile is public until they register with ROTRA."
  - Leaderboard, Who appears here: "Players marked **Not registered yet** were saved by one club and haven't registered with ROTRA. A player saved by more than one club joins the list after they register."
- Tokens: none. The identity cards use `--border-strong`, `--surface`, `--elev`, `--accent`, `--r`; the chip is the existing warn chip.
- Known differences: none.

## Reuse plan
- Reuses as is: sheet, chip (warn), avatar, notice, the Finish registering form, the Registration complete page.
- Extends: profile-card — an unclaimed variant (chip, "Unclaimed" section, "Saved by" in About); leaderboard-row — an
  optional status chip after the name.
- New: identity-picker (a list of selectable identity cards inside a sheet); nothing existing shows one person in
  several clubs' versions.
- Shares work with: [2026-11-16-player-google-sign-in](2026-11-16-player-google-sign-in.md) (the Google
  registration path this step sits in); the Queue and Admin logs for D-2026-11-16-04 dated 2026-11-16.

## Docs updated
- Business logic: none in this change; the identity and players modules are being updated for D-2026-11-16-04 by a
  parallel change.
- Database design: none in this change; same parallel change.
- Screen docs: docs/screens/product/modules/player-information/access-registration.md — new "Registering with an
  email clubs already saved", the masked email on P-CLAIM, the phone hint; ranking-history.md — unclaimed players on
  P-LEADERBOARD; profile.md — the unclaimed profile dialog and page.

## Not changed, because the decision leaves it open
- The email-and-password form's "A ROTRA account or profile already uses this phone number or email" check
  (whether a phone still links a record; which email is matched).
- The preset, read-only phone on the claim form ("Linked to this profile and can't be changed here.").
- Public club member lists (still registered members only) and the leaderboard search box.
- Which club's version is public once a second club saves the same person (they leave the leaderboard; the mockup
  shows no public card for that case).
- Privacy default after claiming: the mockup keeps the profile public, as the claim link already did.

## Real app work
- apps/player: the identity dialog in the Google registration path, claiming by email with the kept RTR ID, the
  masked email on the claim page, and the unclaimed mark on leaderboard rows, the profile dialog and the profile
  page. packages/ui: identity-picker (new), profile-card and leaderboard-row variants. packages/data: unclaimed
  fixtures (one-club and two-club) and the leaderboard rule for them.
