# Player identity and accounts

**Last verified:** 2026-11-20 for Google sign-in in real mode (the Admin link, the inviter on a session invite, one accepted risk; [D-2026-11-20-01](../../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-01)); 2026-11-16 for the four player statuses, unclaimed players with an email and an RTR ID, and lookup by exact RTR ID or email ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04); the mockups and the mock data follow it, #923; the screens are not wired yet and real mode's services still follow the November 11 rules); 2026-11-16 for mandatory Google sign-in, account verification ([D-2026-11-16-01](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-01), [D-2026-11-16-02](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-02)); 2026-11-12 for club-only unclaimed profiles in the services (P08.9: registered-only search, link-only sync, automatic linking at registration, club-record invites); 2026-11-11 for profile visibility, Hide from Player Information, banners and avatars ([D-2026-11-11-11](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11)); 2026-11-08 for guest registration (#490); 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Confirmed v1 target rules.

## Identity states

Four statuses (owner, November 16, 2026, [D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04), superseding in part [D-2026-11-11-03](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-03)). Verified sits on top of Registered.

| State | Behavior |
|---|---|
| Guest | A name only, in one club's Saved players. No email, no social link, no phone, no account, no RTR ID. A guest's games never join an account by name or by themselves; they come along when the guest registers through their own invite link ([D-2026-11-18-07](../../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-07)), or after the club adds an email and the guest becomes unclaimed |
| Unclaimed | A person a club saved with a **required email or social link** (the link since November 23, 2026, #1019) who has not registered. Gets an RTR ID when saved. Found by other clubs by exact RTR ID, exact email or exact social link. Public; no privacy settings until they register |
| Registered | Claimed the profile: required phone and email, signs in with Google (older accounts with a password); can edit permitted personal details |
| Verified | A registered player who passes the three checks under [Account verification](#account-verification), or is Verified by Admin. Unchanged ([D-2026-11-16-02](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-02)) |

**One email is one person and one RTR ID.** ROTRA keeps a thin shared entry for an unclaimed person (the email and the RTR ID). A second club that enters the same email gets the same person and the same RTR ID. Each club keeps its own version of them (name, nickname, picture, level and an optional phone) and edits only its own; no club is shown another club's name, picture or level.

**A social link is an entry key too** ([#1019](https://github.com/jose-codegourmet/rotra-v2/issues/1019)), owner decisions November 22, 2026. A name plus a Facebook, Instagram, YouTube or LinkedIn link saves an unclaimed player with an RTR ID, like an email. Links are normalized before comparing (`m.`, `www.`, `mobile.` and `fb.com` become the provider's site; no query, hash or trailing slash; lower case), and one normalized link is one unclaimed person across clubs. When the email and the link point to two different unclaimed people, the link wins. The key only matters while the person is unclaimed: registering through the club's invite link makes them own that RTR ID at once, and from then on the link is an ordinary profile link they can change, never used to find or match them. Claiming is by invite link only; a matching link on someone's profile does nothing. The link is public on the profile card. The club can edit or remove it in Edit details; with no email and no link left, the club's record goes back to being a **Guest**. No social sign-in: a link is never a sign-in method.

**A club can never edit the email.** To fix a mistyped email the Queue Master deletes the record and adds the player again; the mistaken RTR ID is retired and never reused. Admin can edit the email.

**Player lookup** (Queue › Add player › Player Information, and Saved players › Add player) is by **exact RTR ID or exact email only**, for registered and unclaimed players alike, plus an **exact social link for unclaimed players only** (#1019). *Since [D-2026-11-23-01](../../../../../mvp/decisions/2026-11-23.md#d-2026-11-23-01):* unclaimed players are also found by part of their name, and results show the name and picture of the club that saved them first; the adding club still keeps its own name for them (prefilled). There is no name search there; names are searched only within the club's own Saved players. A guest is never found by another club.

**On registration** the person keeps the RTR ID, and every club's record under that email joins the account with its games, with no Queue Master tap. When more than one club saved the email, a dialog shows each club's version as a card and the person picks one as their starting profile; every club's record joins whichever they pick.

**Unclaimed players are public and can rank.** Privacy settings come with registration. An unclaimed player is on the leaderboard only while exactly one club has saved them; a person saved by more than one club is not listed until they register.

**Older records.** An unclaimed record from before November 16, 2026 that has a phone and no email shows the tag **Details required**. The Queue Master adds an email or deletes the record.

**Accepted risk (owner, November 16, 2026):** a person who never signed up gets a public, ranked profile that other clubs can find by email or RTR ID. Their email and phone stay private as everywhere else. This replaces the phone-linking risk accepted on November 12, 2026. There is no Queue Master **Link** tap.

**Still open ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04)):** whether lookup by phone and by QR code stay; whether a phone still links a record on registration; which email is matched on registration (the ROTRA email, the Google email, or both); whether the Queue Master's Confirm player step applies to another club's unclaimed player. See [open decisions](../../../open-decisions.md).

**Owner decisions, October 28, 2026:** profile creation and permanent RTR ID allocation happen on successful entry sync, without waiting for Session done. Existing profiles are reused. *Superseded in part on November 11, 2026 ([D-2026-11-11-03](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-03)) and again on November 16, 2026 ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04)): the RTR ID is given when a club first saves the person's email, or on registration when no club did.* Match performance remains gated by valid session finalization.

When a club's record joins a profile, include its earlier valid games in personal history and ranking under the existing eligibility rules. Use the original game dates for rolling windows; joining does not make an old game newly played. Preserve club history and permanent results, and count each game once. Public presentation of fun/partial games remains a separate open detail.

**Code:** the mock data (`packages/data`, #923) follows D-2026-11-16-04. An unclaimed person is one shared entry (the email and the RTR ID) that each club's own record points at; registering with that email, as the ROTRA email or the Google email, claims it, keeps the RTR ID and joins every club's record (`useGoogleSignIn`'s `new-account` outcome carries the identity cards as `unclaimed`; `useGoogleRegistration` takes the pick as `identityRecordId`). Older records with a phone and no email still join by phone. Admin's change of the registration place or date gives a new RTR ID and replaces the old one on every record that holds it, with no alias. The Player and Admin screens are not wired to this yet (P15.6, P15.7). Real mode is built in P15.8 (#927): a new thin table `shared_player_entries` (normalized email + RTR ID) that `club_players.shared_entry_id` points to; registration (password or Google, club invite or a record's invite link) keeps the entry's RTR ID and links every club record under it when the ROTRA email or the Google email equals the saved one, and the phone linking still joins older phone-only records; the Google `new-account` outcome and `useUnclaimedIdentities` read the identity cards from the server's verified Google sign-in; Admin's place-or-date change replaces the RTR ID on `shared_player_entries` and `player_id_allocations` in one transaction, with no alias. The picked card only seeds the form (club pictures are not stored in real mode). The migration is applied to a local disposable database only, **not yet to the shared database**; nothing was run against Supabase Auth or in a browser.

## Profile fields and registration

The operator supplies a registration link tied to the existing player profile. The player completes their details and sets a password; SMS verification is not the agreed claiming mechanism.

**Registration sources, club membership and email ([D-2026-11-09-06](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-06)).** A player can register from a club link, a session link or the Admin link. A club or session link adds the player to that club's saved players (“Joined via club link” / “Joined via session link”); the Admin link gives no club and asks for a city or province for the player ID. Being in a club's saved players is what makes a player part of that club; a player can be in several, and a signed-in player opening a club link taps **Join <club>** once. A club link works only with the club's current invite code (`?k=`, #712); a missing, wrong or regenerated code is refused with “This club link is not available.”, never a silent join, and **Regenerate link** stops the old link without removing anyone already in the club. Session links are unchanged. **Leave club** removes the player from that club's saved players; past games stay. It is done from the club page, not the profile, and there is no **Report a problem** ([D-2026-11-12-04](../../../../../mvp/decisions/2026-11-12.md#d-2026-11-12-04)). A player's current clubs show on their profile to anyone who can read that profile (logo and name, each opening the club page, plus a **Host** badge for each club where the player is currently one of its trusted hosts, [D-2026-11-22-01](../../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-01): the badge appears once the saved player is linked to the account, ends when the club removes them from its trusted hosts, never ends membership, and follows the profile's privacy); how they joined is shown only to the player. The player is signed in at once and confirms the email later: a banner keeps asking, and a contact-change request is refused (“Confirm your email first.”) until then.

**Club membership, leaving and rejoining (#1018, [D-2026-11-22-07](../../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-07)).** Claiming a transfer link also makes the player a member. Leaving a club is never blocked: registrations and payments stay, and pending slot transfers the player is part of in that club's sessions are cancelled with their links. Leaving also ends the player's trusted-host status in that club (the Host badge goes). Rejoining reactivates the same record, never the trusted-host status. See [Club membership](../../../queue/modules/players/README.md#club-membership-1018).

**Guest registration decision, November 8, 2026 (#490), partly superseded by D-2026-11-09-06 (linking now needs the QM's one-tap confirmation):** a name-only guest's invitation
must open registration rather than generic sign-in. Registering an account leaves the club's
guest record unlinked. Linking requires a separate invitation; registration or a matching name
does not authorize it. When the supplied phone or email matches an existing ROTRA account,
ask the person whether that account is theirs. Before creating a second account, **Yes** requires sign-in or Admin-reviewed recovery of the existing account;
**No** returns to contact correction or contacting ROTRA. A profile that has not registered yet
requires its existing club-issued claim link. Never create duplicate contacts or treat answering
yes as proof of ownership. No matched identity or private details are revealed.

*Updated November 16, 2026 ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04)):* there is no separate linking invitation. A guest who registers through the generic club invite link or a session page starts a new account without their guest games; the club can add the guest's email first (the guest becomes unclaimed), and registering with that email then claims the record. *Updated November 18, 2026 ([D-2026-11-18-07](../../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-07)):* the invite link the Queue Master copies from a guest's own profile (or Saved players › Invite) belongs to that guest. It is a club-issued claim link (`/claim/<token>`, once, 7 days) for a record with a name only: the form prefills the name and nickname, the person types their own email, phone and password (or uses Google), and the new account is attached to that club player record, so their games and session slots there stay with them and no second record is made. Owner: "As a QM, I created an Account for them, that guest account was intended for them until they feel ready to use that account. So if they enter their details. and they register. That ACCOUNT WAS FOR THEM". The link is the proof: nobody is merged by name alone, an email that already has an account or login and a phone on another profile are still refused, and a person who already has an account cannot attach a guest record through the link (the Queue Master's **Same person** move remains the remedy). An email that clubs already saved as an unclaimed player claims that record on registration and no longer needs the club's claim link ([registration screens](../../../../../screens/product/modules/player-information/access-registration.md)). The phone-or-email check on the email-and-password form is unchanged until the open questions above are answered.

Guest registration opens `/register/[clubId]`. The inviting club supplies the existing founding-city
context for RTR ID allocation only; no guest ID or name is in the URL. New profiles have no club
player linkage or inherited games. The later guest-link invitation flow remains separate work.

Registration includes:

- Full name; operator may preset it.
- Nickname; operator may preset it.
- Gender: Male or Female; public. **Required when registering** (a new record, owner artifact comment, November 19, 2026: “since this is a new record this form will have to require gender”); stays **optional** for accounts registered before, which keep the reminder below. Players without one get a reminder notification and a profile notice until they add it ([D-2026-11-19-01](../../../../../mvp/decisions/2026-11-19.md#d-2026-11-19-01)). The Queue Master may set it for guests and unclaimed players.
- Phone number; operator may preset it; **required**.
- Email; **required**.
- Optional Facebook identity/link, potentially preset by the operator.
- Optional Instagram, YouTube, and LinkedIn links.
- Getting-to-know answers, all **optional** and public ([D-2026-11-19-11](../../../../../mvp/decisions/2026-11-19.md#d-2026-11-19-11)): **where you play** (one of Front court, Back court, All-round), **shots you know** (any of a fixed list: Netting, Smash, Jump smash, Drop, Slice, Clear, Drive, Lift, Net kill, Push, Block, Backhand clear), plus up to 6 of their own under **Others** (24 characters each, no repeats of the list; owner artifact comment, November 19, 2026) and **favorite badminton player** (one of a fixed list of professionals, or Others with a typed name, 40 characters at most). They replace the free-text playing style.
- Optional playing experience, entered as years + months or as **playing since** (month, year); either fills the other, and it is kept as playing since so it stays current (owner, November 8, 2026).
- **Registration prefill (owner, November 8, 2026):** the registration form starts from what the club entered (name, nickname, email, playing style, experience, links); the player can change any of it and sets a password. A profile with no phone on file asks the player for one at registration; a number already on another profile is refused.

Experience can inform the initial operator assessment but is not automatic ranking credit. The getting-to-know field list is settled ([D-2026-11-19-11](../../../../../mvp/decisions/2026-11-19.md#d-2026-11-19-11)); social-link visibility is open.

**Onboarding after an invite link (owner, November 19, 2026; [D-2026-11-19-11](../../../../../mvp/decisions/2026-11-19.md#d-2026-11-19-11)):** a player who accepts the club-created profile's registration link or a session game link registers through a fullscreen onboarding of four steps: their details (the registration form, prefilled from what the club saved; required), then where they play, shots they know and favorite player (each skippable). The account is created when the details are sent, so leaving afterwards keeps it; skipped answers can be added later in Edit profile.

## Login and recovery

**Google sign-in is mandatory (owner, November 16, 2026, [D-2026-11-16-01](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-01)).** This changes the email + password rules below:

- **Behind a feature flag that starts off (owner, November 18, 2026, [D-2026-11-18-01](../../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-01)).** The rules in this list apply only while the platform feature flag `player_google_sign_in` is on. While it is off, the Player app works as before: the "earlier rules" further down, with email + password sign-in and registration and no Google prompts. The platform owner turns it on in Admin.
- **New players register with Google only**, from a club invite, a session invite or the Admin link. The Google email becomes the ROTRA email and is confirmed at once. Phone stays required. A club-created profile connects Google at claim instead of setting a password.
- **Existing password players** still sign in with their password and are asked to connect Google by a deadline (December 31, 2026) through a yellow ROTRA announcement on every page. After the deadline a password sign-in without Google must connect Google before going on.
- **Linking an existing account.** Google already connected: signs in. Google email equals a password account's email: the player is asked once to connect it ("Connect Google to your account?"); never linked silently. A different email: not signed in; the player signs in with the password and connects it then. A Google email already used by another ROTRA account is refused.
- **Connecting while signed in:** any Google account the player owns, even with a different email. Connecting never changes the ROTRA email. Google can be changed, not disconnected.
- **No Google account:** the player is told how to make a free Google account with the email they already use. Clubs and ROTRA can help; nothing on the profile is lost meanwhile.
- **Google sign-in on `/login` never creates an account** (owner, November 18, 2026): new accounts come only from the registration sources above.
- **Recovery:** Admin-reviewed password reset applies to password accounts only; an account that signs in with Google is told to use Google.
- **Owner, November 18, 2026:** the deadline is December 31, 2026 (a swappable value, not an Admin setting yet); the password stays a backup until then once Google is connected; a signed-in player confirmed for a session at a club they aren't in does not join that club's saved players.
- **Real mode (#922, November 18, 2026; completed November 20, 2026): written, not run against Google** (the Google and Supabase setup, #896, is pending; migration `20261118000200_player_google_sign_in` is applied to the shared database). ROTRA's own record of the connected Google email decides who is signed in: a Google account that the sign-in provider attaches to a password account by itself is not a connection until the player answers **Connect Google to your account?**, and choosing **Use my password instead** or leaving signs nobody in. A Google sign-in that matches no account leaves no usable login behind on `/login`. Registration from the Admin link and the inviting player's name on a session invite are in real mode too (owner, November 20, 2026, [D-2026-11-20-01](../../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-01)): the Admin link asks for a city or province and the RTR ID takes that place, with no club joined; a session invite's code names the player who made it, and an unknown code names nobody. [Setup and design](../../../../../backend/google-sign-in-setup.md).
- Supabase's automatic linking of same-email identities never skips the "ask first" step: the callback decides from ROTRA's own record (#922).
- **Accepted risk (owner, November 20, 2026, [D-2026-11-20-01](../../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-01)):** an unconfirmed password account registered with someone else's Gmail address is offered **Connect Google to your account?** when the Gmail's real owner signs in with Google, and a yes signs that person in to it. Kept as built: few of the accounts registered before that date could be like this.
- **By design:** a profile that is already registered can't connect Google through a registration link; the link shows "already registered" and **Sign in**, and Google is connected from Sign-in methods once signed in ([D-2026-11-18-07](../../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-07): a person who already has an account cannot attach a record through a link).

Earlier rules, still true for password accounts until the deadline:

- Sign in with **email + password**. Phone is not a sign-in identifier.
- **Owner decisions, November 7, 2026 (#244):** the auth account is keyed by **email + password**; email is required for every player account. No phone provider and no SMS.
- **Changed November 8, 2026 (owner):** the phone-lookup sign-in decided on November 7 is withdrawn. Email is the only login; phone stays a contact and the profile-matching key for clubs.
- A failed sign-in never reveals whether an email exists or whether the profile is registered.
- The player profile links to the auth user; the auth user is not the player identity.
- No Facebook or other social login. *Changed November 16, 2026:* Google is required (above); it is the only social provider.
- Forgotten passwords: submit the account email for ROTRA Admin review; no automatic email. Admin verifies ownership and provides a single-use expiring reset link (#491, owner request November 8, 2026).
- The club operator's role is initial player entry/registration-link delivery, not routine password recovery.
- Claim links are valid **24 hours** and **single use** (changed from 7 days on November 11, 2026, [D-2026-11-11-08](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-08)); the club (Queue Master) can reissue, and reissuing invalidates the previous link (decided 2026-11-07, #244). If the phone or email at claim already belongs to another account, the claim is blocked with a contact-support route; never merge silently. An RTR ID or name alone never claims an account.
- **Decided November 11, 2026 ([D-2026-11-11-08](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-08)):**
  - **No email verification on claim.** Opening the club's link is the proof; the claim confirms the email at once.
  - **Password rule:** at least 8 characters, nothing else.
  - **A link claimed by the wrong person is not undone.** The Queue Master is responsible for the links and creates a new player for the right person; the short lifetime is the guard.
  - **Name-only guests** can be invited once the club adds a phone or email to the record. *Since November 16, 2026 ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04)):* adding an email makes the guest an unclaimed player with an RTR ID.
  - **RTR ID sequence:** the database hands out the next number first come, first served. The RTR ID is display only; every record keys on the player UUID. Founding cities are added by the platform owner from Admin ([D-2026-11-11-07](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-07)).
- Still open: contact-change approval evidence beyond the owner's manual review, and failed provider application recovery beyond "Application failed".

## Account verification

**Owner, November 16, 2026 ([D-2026-11-16-02](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-02)).** A player is **Verified** when all three hold:

1. A Google account is connected.
2. A phone number is on the account.
3. The ROTRA email is the Google account's email.

The status is worked out from those facts. The one exception is **Verified by Admin**: ROTRA Admin sets it on the player, and the checks are skipped. A mismatched email is fixed by a normal contact-change request to the Google email (Admin approval, as for any email change) or by connecting the Google account that uses the ROTRA email. New Google registrations are verified at once.

The player sees it on its own profile setting, **Verification**, and as a chip on the own profile; it is not part of Privacy and contact. The yellow ROTRA announcement asks unverified players to finish by the Google deadline.

Still open: what an unverified player can't do (nothing for now); whether the phone must be confirmed (no SMS exists); whether others see the badge.

**Owner, November 18, 2026 (#907):** Admin can set **Verified by Admin** for a registered player or clear that override, returning to the derived status. There is no forced **Not verified** override. Each set or clear requires a reason, retained in the Admin audit log. Admin sees a Verification card on Player detail with status and all three checks, including while the override is active.

## Personal editing and privacy

Players may edit their own personal information after claiming the profile. They cannot edit games, outcomes, or calculated rank.

Registered players may hide their phone number from club operators. Phone/email are not public profile or leaderboard fields. A hidden phone must not leak through player search; ID/QR supports identification instead.

**Profile visibility** ([D-2026-11-11-11](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11), superseding in part [D-2026-11-09-07](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-07), which had one Public/Private switch with Public as the default). A player picks one of three levels; **the default is Private**, including for new registrations. An **unclaimed** player has no visibility setting and is Public until they register ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04)):

| Level | Who sees the profile |
|---|---|
| **Public** | Visitors and signed-in ROTRA players see name, level, games and the profile |
| **Private** (default) | Visitors who aren't signed in see a masked name; signed-in ROTRA players see the profile. The leaderboard masks the name and doesn't open the row for a visitor, name search and RTR ID search don't find them, and a shared link shows "Log in with ROTRA to see this profile." Guests are treated the same way |
| **Always private** | Nobody but the player sees their **name, level and games**, signed in or not, except the Queue Master of a session the player joins. The **picture and banner stay public**. A profile card or page for them shows the picture, the banner, a masked name and a **Private profile** note; there is no sign-in button, because signing in would not change what is shown |

Visibility changes nothing about phone privacy.

**Always private, what is exposed.** Face and banner are the only parts of an always-private player that others can see: the picture (photo, character or initials as the player chose) and the profile banner. The name is masked as "first letter of each word followed by `***`" everywhere another person would see it (leaderboard, podium, club member lists, session participants, share images). Level, games and stats stay hidden. The player themselves always sees everything about their own profile.

**Hide from Player Information** ([D-2026-11-11-11](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11)). A separate switch, off by default, in the Player Information card of Privacy and contact. When on, clubs can't find the player in Queue's **Add player › Player Information** lookup (by RTR ID or email), and the player is left out of the member list of a [public club page](../../README.md#public-club-page-737-epic-p07). It does not hide them from a club's **Saved players**, from Admin or from the public session page, and a club that already saved the player can still add them from Saved players. The player joins sessions themselves (a club link or a session link), so they only join a queue when they intend to (owner, November 11, 2026). It is independent of profile visibility and of phone privacy.

Players cannot change phone or email themselves. They must contact the platform owner or submit a request, and the owner manually approves the change in Admin. A contact change does not change the RTR ID.

Whether club operators can continue editing non-ranking personal details after a profile is claimed was not answered and remains open.

## Privacy Policy and Terms of Service pages

**Owner, November 17, 2026 ([D-2026-11-17-01](../../../../../mvp/decisions/2026-11-17.md#d-2026-11-17-01)).** The Player app has two public, static pages that the Google sign-in consent screen links to: **Privacy Policy** at `/privacy` and **Terms of Service** at `/terms` ([screens](../../../../../screens/product/modules/player-information/legal.md)). Both give `support@rotra.club` for questions and privacy requests, are written for the Philippines (the Data Privacy Act of 2012, Republic Act No. 10173; Philippine law governs the terms) and take effect November 18, 2026. P-LOGIN says "By continuing you agree to the Terms of Service and Privacy Policy."

*Updated November 18, 2026 ([D-2026-11-18-02](../../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-02)):* the text was rewritten into a fuller version. The operator is named as “Jose Adrian Buctuanon (doing business as CodeGourmet IO)”, Lapu-Lapu City, Cebu, Philippines, and the courts in the terms are those of Lapu-Lapu City (owner, November 18, 2026; these replaced the placeholders the rewrite shipped with). The same text is shown on rotra.club (`/privacy`, `/terms`), so it also covers clubs that request a quotation there. It lives word for word in the mockup (`LEGAL`), in `apps/player/src/app/(public)/privacy/content.ts` and `.../terms/content.ts`, and in `apps/landingpage/src/app/_components/legal-page/privacy-content.ts` and `terms-content.ts`.

- **Privacy Policy** describes what this module and the profile rules already say: the operator and its Data Protection Officer (reached at `support@rotra.club`); the club's role (it decides whom it saves and needs the right to) and ROTRA's (the platform, profiles and ranks); what ROTRA collects (account details, the Google email, name and picture only when the player signs in with Google, play data, what a club saves, club account details, a quotation request and a profile search on rotra.club, sign-in cookies, logs, traces and page-visit counts); unclaimed profiles being public until the person registers, and the person's right to object or ask for removal; the legal basis for each use (contract, consent, legitimate interests, legal obligation); ranks and leaderboards worked out automatically, with no legal effect; the three visibility levels, email and phone never public and the phone masked; who sees what (clubs, the named service providers Vercel, Supabase, Google and Grafana Labs, the law, a new operator after a sale or merger); storage outside the Philippines and protection; breach notice to the National Privacy Commission within 72 hours when the law requires; keeping data while the account or profile exists and what is needed afterwards, with no retention numbers; cookies and device storage only for sign-in and settings; the Data Privacy Act rights and how to use them by email; children; links to other sites.
- **Terms of Service** describe how ROTRA is used: the operator, and acting for a club; the age rule (18 to register on your own, under 18 only with a parent's or guardian's consent, a club that adds a minor confirms that consent); email and password sign-in, or Google where it is offered, and one account per person; club accounts and licenses (a quotation request is not a contract; fees, period, payment and refunds are as the accepted quotation says; what happens when a license ends; the club's responsibilities); clubs running their own Queue Sessions, fees and payments between the player and the club (ROTRA never collects money); playing at your own risk; results recorded by the club (permanent once confirmed; invalid matches and sessions don't count; ranks are not an official rating); acceptable use; the player's content; ROTRA's property; other companies' services; suspension; the service as it is (a new product, partly made with the help of AI tools); limits on liability; claims caused by the user; events outside our control; changes; Philippine law and disputes; general terms.
- **Age.** A player must be 18 or older to register on their own; anyone under 18 may use ROTRA only with a parent's or guardian's consent, and a club that adds a minor confirms it has that consent (owner, November 18, 2026). Registration does not ask for an age or a birth date, and no screen asks a club to confirm consent; today the rule is stated in the pages only.
- They add no other rules. A page that contradicts this module is wrong and is fixed in the mockup, `apps/player` and `apps/landingpage` together.

## RTR ID

*Updated November 16, 2026 ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04)):* the RTR ID is no longer strictly permanent. No club or player can change it, but Admin can.

Format: **`RTR-PH-CEB-102926-0001`**.

| Part | Meaning |
|---|---|
| `RTR` | ROTRA prefix |
| `PH` | Country/region code in the user's example |
| `CEB` | City from the creating club's fixed founding address, not the player's home or session venue |
| `102926` | The day the RTR ID was given, in MMDDYY form; example is October 29, 2026 |
| `0001` | Sequence restarting for each city on each day |

Assign the ID **when a club first saves the person's email** (they become unclaimed), or when the player registers if no club saved them ([D-2026-11-16-04](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04); from November 11 to 16, 2026 it was only on registration, before that the first entry sync), never offline. The place comes from the first club that entered the email and the date is that day; neither changes when another club adds the player or when the person later registers, also through another club's link. The person keeps the same ID on registration.

The ID stays the same after address, club, phone, or email changes. **Admin can change it** by changing the registration place or date; the ID follows both and keeps its number at the end, and it is never typed by hand. The change cascades: every record that holds the old ID is updated to the new one. An ID retired because a club deleted a record with a mistyped email is never reused. Whether an old ID in a QR code or link a player already shared still leads to them is open. Code mappings, date timezone, allocation under concurrent sync, and large-sequence formatting need technical specification; do not create provisional offline IDs in this format.

See [claim/recovery flow](flow/claim-and-recover.md) and [Admin contact changes](../../../admin/modules/player-management/README.md).

## Admin-issued registration links (#345)

ROTRA Admin can issue a claim link for an unclaimed player, using `/claim/{token}`. It replaces the previous active link and expires after 24 hours (changed from seven days on November 11, 2026). The audit records issuer and expiry, never the token. Queue's legacy mock invite now uses the same path, but its deterministic fixture token is still a preview placeholder. Dynamically issued Admin links resolve against the current in-memory store; cross-origin claims require the shared F07 transport. No email or SMS is sent. **No club is assigned** (owner decision, November 8, 2026): a player who registers from an Admin-issued link is not added to any club, and clubs that already played with the profile keep their own records; only a club's own invite or session add connects a player to that club.

## Two uploaded pictures only ([D-2026-11-09-10](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-10))

Only the current and the previous uploaded photo are kept. A new upload makes the old current photo the previous one; **Use previous picture** swaps the two; choosing a character or initials, or **Remove**, makes the last photo the previous one. Characters and initials store no file. Anything older is deleted in the same request as the new upload.

## Character choices come from the Admin library ([D-2026-11-09-13](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-13), page size changed by [D-2026-11-11-11](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11))

The characters a player can pick are the images the platform owner shows in Admin › Profile characters, in upload order, **15 per page** (was 8; owner comment, November 11, 2026): the picker is a fixed grid of 5 round characters per row, 3 rows. Admin keeps at least 15 shown so the first page is full. The dialog opens on the page holding the player's current character. A player keeps a character that Admin later hides or deletes. (Owner comment, November 9, 2026; not built yet.)

## Profile banner ([D-2026-11-11-11](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11))

Every profile has a **banner**: the strip across the top of the profile card, public like the picture, in the same way for the player's own profile and for another player's, and for every visibility level including Always private.

- **Predefined banners only.** A player picks one of the banners the platform owner shows in Admin › Settings › Profile banners, managed like the profile characters. There is **no upload and no remove** for players. A player who hasn't picked one (and every guest and unclaimed profile) shows the **default banner**, which the platform owner picks in Admin › Profile banners; Court at first ([D-2026-11-13-03](../../../../../mvp/decisions/2026-11-13.md#d-2026-11-13-03), November 13, 2026, replacing “Court, or the first shown banner”). A player keeps a banner that Admin later hides or deletes.
- A player picks a banner in the **Profile banner** dialog, opened from the banner pencil on their own profile card or the Edit profile preview, the same as the profile picture: the pick is a draft until **Done**, which saves it (toast **Banner updated**); cancelling discards it. It is outside Edit profile's Save changes, and no file is stored for the player ([D-2026-11-12-03](../../../../../mvp/decisions/2026-11-12.md#d-2026-11-12-03)).
- The banner shows at **5:2** and nothing overlaps it; only the owner's banner pencil sits on it. Admin uploads are cropped to 5:2.
- Banners are drawn from the theme tokens in the prototype, so both themes hold up.

**Avatars are circles.** The big profile picture and every other avatar shown anywhere in ROTRA are circles (owner comments, November 11, 2026); no rounded-square avatar remains.

**Full photo.** Any avatar that shows a real picture (an uploaded photo or a chosen character, never initials) opens the full picture on a black overlay, closed by a tap, **×** or Esc. Where a tap already opens a profile, the picture opens from inside that profile instead. Nothing opens when there is no picture to show.

## Profile picture drafts (#567)

Photo, initials and character choices remain local until **Done**, independently of Edit profile Save.
Crop, position, zoom and rotation never upload or mutate the profile. Dismissal discards the draft;
Done saves once through the authenticated owner-only handler under the loaded revision. Failure keeps
the editable draft and previous picture. Supported photo inputs are WebP, GIF, PNG, HEIC/HEIF and JPEG.
Animations remain animated after framing and persistence; HEIC/HEIF is converted to browser-compatible
WebP. Resource/storage limits and the approved decoder are in the
[storage decision](../../../../../database_design/product/player-information/modules/identity.md#profile-picture-storage-542).
