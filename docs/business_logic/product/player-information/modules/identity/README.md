# Player identity and accounts

**Last verified:** 2026-11-12 for club-only unclaimed profiles in the services (P08.9: registered-only search, link-only sync, automatic linking at registration, club-record invites); 2026-11-11 for profile visibility, Hide from Player Information, banners and avatars ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11)); 2026-11-08 for guest registration (#490); 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Confirmed v1 target rules.

## Identity states

| State | Behavior |
|---|---|
| Name-only guest | Remembered by the club; no automatic Player Information profile |
| Phone-linked, unclaimed profile | A club's saved player with a phone who has not registered. Lives only in that club: no RTR ID, never in another club's search ([D-2026-11-11-03](../../../../../mvp/decisions.md#d-2026-11-11-03)) |
| Registered/claimed profile | Required phone and email supplied; password set; player can sign in and edit permitted personal details |

Phone number uniquely identifies a **registered** player across clubs. Unclaimed profiles never link across clubs: two clubs that save the same phone keep separate records until the person registers, and then every record with that phone links to the account automatically ([D-2026-11-11-03](../../../../../mvp/decisions.md#d-2026-11-11-03)). Name matches only suggest possible identities. Registered players hiding their phone can identify themselves with RTR ID or QR code.

**Accepted risk (owner answer, November 12, 2026):** registration does not verify the phone (no SMS). With automatic linking, someone who registers with another person's number collects that person's guest records from every club. Accepted for MVP, like the ranking risk in [D-2026-11-09-06](../../../../../mvp/decisions.md#d-2026-11-09-06); revisit when SMS verification exists. There is no Queue Master **Link** tap.

**Owner decisions, October 28, 2026:** profile creation and permanent RTR ID allocation happen on successful entry sync, without waiting for Session done. Existing profiles are reused. *Superseded in part on November 11, 2026 ([D-2026-11-11-03](../../../../../mvp/decisions.md#d-2026-11-11-03)): sync only links a phone to a registered player; the RTR ID is given on registration.* Match performance remains gated by valid session finalization.

When a returning guest's identity is confirmed and linked to a profile, include their earlier valid games in personal history and ranking under the existing eligibility rules. Use the original game dates for rolling windows; linking does not make an old game newly played. Preserve club history and permanent results, and count each game once. The confirmation evidence, mistaken-link resolution, and public presentation of fun/partial games remain separate open details.

## Profile fields and registration

The operator supplies a registration link tied to the existing player profile. The player completes their details and sets a password; SMS verification is not the agreed claiming mechanism.

**Registration sources, club membership and email ([D-2026-11-09-06](../../../../../mvp/decisions.md#d-2026-11-09-06)).** A player can register from a club link, a session link or the Admin link. A club or session link adds the player to that club's saved players (“Joined via club link” / “Joined via session link”); the Admin link gives no club and asks for a city or province for the player ID. Being in a club's saved players is what makes a player part of that club; a player can be in several, and a signed-in player opening a club link taps **Join <club>** once. A club link works only with the club's current invite code (`?k=`, #712); a missing, wrong or regenerated code is refused with “This club link is not available.”, never a silent join, and **Regenerate link** stops the old link without removing anyone already in the club. Session links are unchanged. **Leave club** removes the player from that club's saved players; past games stay. It is done from the club page, not the profile, and there is no **Report a problem** ([D-2026-11-12-04](../../../../../mvp/decisions.md#d-2026-11-12-04)). A player's current clubs show on their profile to anyone who can read that profile (logo and name, each opening the club page); how they joined is shown only to the player. The player is signed in at once and confirms the email later: a banner keeps asking, and a contact-change request is refused (“Confirm your email first.”) until then.

**Guest registration decision, November 8, 2026 (#490), partly superseded by D-2026-11-09-06 (linking now needs the QM's one-tap confirmation):** a name-only guest's invitation
must open registration rather than generic sign-in. Registering an account leaves the club's
guest record unlinked. Linking requires a separate invitation; registration or a matching name
does not authorize it. When the supplied phone or email matches an existing ROTRA account,
ask the person whether that account is theirs. Before creating a second account, **Yes** requires sign-in or Admin-reviewed recovery of the existing account;
**No** returns to contact correction or contacting ROTRA. A profile that has not registered yet
requires its existing club-issued claim link. Never create duplicate contacts or treat answering
yes as proof of ownership. No matched identity or private details are revealed.

Guest registration opens `/register/[clubId]`. The inviting club supplies the existing founding-city
context for RTR ID allocation only; no guest ID or name is in the URL. New profiles have no club
player linkage or inherited games. The later guest-link invitation flow remains separate work.

Registration includes:

- Full name; operator may preset it.
- Nickname; operator may preset it.
- Phone number; operator may preset it; **required**.
- Email; **required**.
- Optional Facebook identity/link, potentially preset by the operator.
- Optional Instagram, YouTube, and LinkedIn links.
- Getting-to-know information such as playing style.
- Optional playing experience, entered as years + months or as **playing since** (month, year); either fills the other, and it is kept as playing since so it stays current (owner, November 8, 2026).
- **Registration prefill (owner, November 8, 2026):** the registration form starts from what the club entered (name, nickname, email, playing style, experience, links); the player can change any of it and sets a password. A profile with no phone on file asks the player for one at registration; a number already on another profile is refused.

Experience can inform the initial operator assessment but is not automatic ranking credit. The exact playing-style field list and social-link visibility are open.

## Login and recovery

- Sign in with **email + password**. Phone is not a sign-in identifier.
- **Owner decisions, November 7, 2026 (#244):** the auth account is keyed by **email + password**; email is required for every player account. No phone provider and no SMS.
- **Changed November 8, 2026 (owner):** the phone-lookup sign-in decided on November 7 is withdrawn. Email is the only login; phone stays a contact and the profile-matching key for clubs.
- A failed sign-in never reveals whether an email exists or whether the profile is registered.
- The player profile links to the auth user; the auth user is not the player identity.
- No Facebook/social login.
- Forgotten passwords: submit the account email for ROTRA Admin review; no automatic email. Admin verifies ownership and provides a single-use expiring reset link (#491, owner request November 8, 2026).
- The club operator's role is initial player entry/registration-link delivery, not routine password recovery.
- Claim links are valid **24 hours** and **single use** (changed from 7 days on November 11, 2026, [D-2026-11-11-08](../../../../../mvp/decisions.md#d-2026-11-11-08)); the club (Queue Master) can reissue, and reissuing invalidates the previous link (decided 2026-11-07, #244). If the phone or email at claim already belongs to another account, the claim is blocked with a contact-support route; never merge silently. An RTR ID or name alone never claims an account.
- **Decided November 11, 2026 ([D-2026-11-11-08](../../../../../mvp/decisions.md#d-2026-11-11-08)):**
  - **No email verification on claim.** Opening the club's link is the proof; the claim confirms the email at once.
  - **Password rule:** at least 8 characters, nothing else.
  - **A link claimed by the wrong person is not undone.** The Queue Master is responsible for the links and creates a new player for the right person; the short lifetime is the guard.
  - **Name-only guests** can be invited once the club adds a phone or email to the record.
  - **RTR ID sequence:** the database hands out the next number first come, first served. The RTR ID is display only; every record keys on the player UUID. Founding cities are added by the platform owner from Admin ([D-2026-11-11-07](../../../../../mvp/decisions.md#d-2026-11-11-07)).
- Still open: contact-change approval evidence beyond the owner's manual review, and failed provider application recovery beyond "Application failed".

## Personal editing and privacy

Players may edit their own personal information after claiming the profile. They cannot edit games, outcomes, or calculated rank.

Registered players may hide their phone number from club operators. Phone/email are not public profile or leaderboard fields. A hidden phone must not leak through player search; ID/QR supports identification instead.

**Profile visibility** ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11), superseding in part [D-2026-11-09-07](../../../../../mvp/decisions.md#d-2026-11-09-07), which had one Public/Private switch with Public as the default). A player picks one of three levels; **the default is Private**, including for new registrations:

| Level | Who sees the profile |
|---|---|
| **Public** | Visitors and signed-in ROTRA players see name, level, games and the profile |
| **Private** (default) | Visitors who aren't signed in see a masked name; signed-in ROTRA players see the profile. The leaderboard masks the name and doesn't open the row for a visitor, name search and RTR ID search don't find them, and a shared link shows "Log in with ROTRA to see this profile." Guests are treated the same way |
| **Always private** | Nobody but the player sees their **name, level and games**, signed in or not, except the Queue Master of a session the player joins. The **picture and banner stay public**. A profile card or page for them shows the picture, the banner, a masked name and a **Private profile** note; there is no sign-in button, because signing in would not change what is shown |

Visibility changes nothing about phone privacy.

**Always private, what is exposed.** Face and banner are the only parts of an always-private player that others can see: the picture (photo, character or initials as the player chose) and the profile banner. The name is masked as "first letter of each word followed by `***`" everywhere another person would see it (leaderboard, podium, club member lists, session participants, share images). Level, games and stats stay hidden. The player themselves always sees everything about their own profile.

**Hide from Player Information** ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11)). A separate switch, off by default, in the Player Information card of Privacy and contact. When on, clubs can't find the player in Queue's **Add player › Player Information** search or by RTR ID, and the player is left out of the member list of a [public club page](../../README.md#public-club-page-737-epic-p07). It does not hide them from a club's **Saved players**, from Admin or from the public session page, and a club that already saved the player can still add them from Saved players. The player joins sessions themselves (a club link or a session link), so they only join a queue when they intend to (owner, November 11, 2026). It is independent of profile visibility and of phone privacy.

Players cannot change phone or email themselves. They must contact the platform owner or submit a request, and the owner manually approves the change in Admin. A contact change does not replace the permanent RTR ID.

Whether club operators can continue editing non-ranking personal details after a profile is claimed was not answered and remains open.

## Permanent RTR ID

Format: **`RTR-PH-CEB-102926-0001`**.

| Part | Meaning |
|---|---|
| `RTR` | ROTRA prefix |
| `PH` | Country/region code in the user's example |
| `CEB` | City from the creating club's fixed founding address, not the player's home or session venue |
| `102926` | First profile-sync date in MMDDYY form; example is October 29, 2026 |
| `0001` | Sequence restarting for each city on each sync day |

Assign the permanent ID **when the player registers** ([D-2026-11-11-03](../../../../../mvp/decisions.md#d-2026-11-11-03); before November 11, 2026 it was the first entry sync), never offline. The date part is the registration day. Existing IDs keep their value when another club adds the player.

The ID remains permanent even after address, club, phone, or email changes. Code mappings, date timezone, allocation under concurrent sync, and large-sequence formatting need technical specification; do not create provisional offline IDs in this permanent format.

See [claim/recovery flow](flow/claim-and-recover.md) and [Admin contact changes](../../../admin/modules/player-management/README.md).

## Admin-issued registration links (#345)

ROTRA Admin can issue a claim link for an unclaimed player, using `/claim/{token}`. It replaces the previous active link and expires after 24 hours (changed from seven days on November 11, 2026). The audit records issuer and expiry, never the token. Queue's legacy mock invite now uses the same path, but its deterministic fixture token is still a preview placeholder. Dynamically issued Admin links resolve against the current in-memory store; cross-origin claims require the shared F07 transport. No email or SMS is sent. **No club is assigned** (owner decision, November 8, 2026): a player who registers from an Admin-issued link is not added to any club, and clubs that already played with the profile keep their own records; only a club's own invite or session add connects a player to that club.

## Two uploaded pictures only ([D-2026-11-09-10](../../../../../mvp/decisions.md#d-2026-11-09-10))

Only the current and the previous uploaded photo are kept. A new upload makes the old current photo the previous one; **Use previous picture** swaps the two; choosing a character or initials, or **Remove**, makes the last photo the previous one. Characters and initials store no file. Anything older is deleted in the same request as the new upload.

## Character choices come from the Admin library ([D-2026-11-09-13](../../../../../mvp/decisions.md#d-2026-11-09-13), page size changed by [D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11))

The characters a player can pick are the images the platform owner shows in Admin › Profile characters, in upload order, **15 per page** (was 8; owner comment, November 11, 2026): the picker is a fixed grid of 5 round characters per row, 3 rows. Admin keeps at least 15 shown so the first page is full. The dialog opens on the page holding the player's current character. A player keeps a character that Admin later hides or deletes. (Owner comment, November 9, 2026; not built yet.)

## Profile banner ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11))

Every profile has a **banner**: the strip across the top of the profile card, public like the picture, in the same way for the player's own profile and for another player's, and for every visibility level including Always private.

- **Predefined banners only.** A player picks one of the banners the platform owner shows in Admin › Settings › Profile banners, managed like the profile characters. There is **no upload and no remove** for players. A player who hasn't picked one (and every guest and unclaimed profile) shows the **default banner**, which the platform owner picks in Admin › Profile banners; Court at first ([D-2026-11-13-03](../../../../../mvp/decisions.md#d-2026-11-13-03), November 13, 2026, replacing “Court, or the first shown banner”). A player keeps a banner that Admin later hides or deletes.
- A player picks a banner in the **Profile banner** dialog, opened from the banner pencil on their own profile card or the Edit profile preview, the same as the profile picture: the pick is a draft until **Done**, which saves it (toast **Banner updated**); cancelling discards it. It is outside Edit profile's Save changes, and no file is stored for the player ([D-2026-11-12-03](../../../../../mvp/decisions.md#d-2026-11-12-03)).
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
