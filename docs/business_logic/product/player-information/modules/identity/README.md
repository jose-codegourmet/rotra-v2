# Player identity and accounts

**Last verified:** 2026-11-08 for guest registration (#490); 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Confirmed v1 target rules.

## Identity states

| State | Behavior |
|---|---|
| Name-only guest | Remembered by the club; no automatic Player Information profile |
| Phone-linked, unclaimed profile | Created as soon as the phone-linked entry successfully syncs; player has not completed registration |
| Registered/claimed profile | Required phone and email supplied; password set; player can sign in and edit permitted personal details |

Phone number uniquely identifies a player across clubs. Name matches only suggest possible identities. Registered players hiding their phone can identify themselves with RTR ID or QR code.

**Owner decisions, October 28, 2026:** profile creation and permanent RTR ID allocation happen on successful entry sync, without waiting for Session done. Existing profiles are reused. Match performance remains gated by valid session finalization.

When a returning guest's identity is confirmed and linked to a profile, include their earlier valid games in personal history and ranking under the existing eligibility rules. Use the original game dates for rolling windows; linking does not make an old game newly played. Preserve club history and permanent results, and count each game once. The confirmation evidence, mistaken-link resolution, and public presentation of fun/partial games remain separate open details.

## Profile fields and registration

The operator supplies a registration link tied to the existing player profile. The player completes their details and sets a password; SMS verification is not the agreed claiming mechanism.

**Guest registration decision, November 8, 2026 (#490):** a name-only guest's invitation
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
- Claim links are valid **7 days** and **single use**; the club (Queue Master) can reissue, and reissuing invalidates the previous link (decided 2026-11-07, #244). If the phone or email at claim already belongs to another account, the claim is blocked with a contact-support route; never merge silently. An RTR ID or name alone never claims an account.
- Still open: email verification on claim, password policy/complexity, separate guest-link invitation verification, mistaken/duplicate guest links and permanent relink, and failed provider application handling.

## Personal editing and privacy

Players may edit their own personal information after claiming the profile. They cannot edit games, outcomes, or calculated rank.

Registered players may hide their phone number from club operators. Phone/email are not public profile or leaderboard fields. A hidden phone must not leak through player search; ID/QR supports identification instead.

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

Assign the permanent ID **on the first successful entry sync into Player Information**, never offline and without waiting for Session done. Use the day synced, not the original offline entry date. Existing profiles keep their ID when another club adds them.

The ID remains permanent even after address, club, phone, or email changes. Code mappings, date timezone, allocation under concurrent sync, and large-sequence formatting need technical specification; do not create provisional offline IDs in this permanent format.

See [claim/recovery flow](flow/claim-and-recover.md) and [Admin contact changes](../../../admin/modules/player-management/README.md).

## Admin-issued registration links (#345)

ROTRA Admin can issue a claim link for an unclaimed player, using `/claim/{token}`. It replaces the previous active link and expires after seven days. The audit records issuer and expiry, never the token. Queue's legacy mock invite now uses the same path, but its deterministic fixture token is still a preview placeholder. Dynamically issued Admin links resolve against the current in-memory store; cross-origin claims require the shared F07 transport. No email or SMS is sent. **No club is assigned** (owner decision, November 8, 2026): a player who registers from an Admin-issued link is not added to any club, and clubs that already played with the profile keep their own records; only a club's own invite or session add connects a player to that club.

## Profile picture drafts (#567)

Photo, initials and character choices remain local until **Done**, independently of Edit profile Save.
Crop, position, zoom and rotation never upload or mutate the profile. Dismissal discards the draft;
Done saves once through the authenticated owner-only handler under the loaded revision. Failure keeps
the editable draft and previous picture. Supported photo inputs are WebP, GIF, PNG, HEIC/HEIF and JPEG.
Animations remain animated after framing and persistence; HEIC/HEIF is converted to browser-compatible
WebP. Resource/storage limits and the approved decoder are in the
[storage decision](../../../../../database_design/product/player-information/modules/identity.md#profile-picture-storage-542).
