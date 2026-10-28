# Player identity and accounts

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

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

Registration includes:

- Full name; operator may preset it.
- Nickname; operator may preset it.
- Phone number; operator may preset it; **required**.
- Email; **required**.
- Optional Facebook identity/link, potentially preset by the operator.
- Optional Instagram, YouTube, and LinkedIn links.
- Getting-to-know information such as playing style.
- Optional years/months of playing experience.

Experience can inform the initial operator assessment but is not automatic ranking credit. The exact playing-style field list and social-link visibility are open.

## Login and recovery

- Sign in with **phone or email + password**.
- No Facebook/social login.
- Forgotten passwords are recovered by email.
- The club operator's role is initial player entry/registration-link delivery, not routine password recovery.
- Link lifetime, verification, and recovery details still need a focused account-flow specification.

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
