# Player Information screen modules

**Audience:** public visitors and registered players. Keep v1 lean.

| Module | Surfaces |
|---|---|
| [Access and registration](access-registration.md) | Phone/email login, operator-issued profile claim, email password recovery |
| [Profile](profile.md) | Public identity, own profile, permitted personal editing |
| [Identity and privacy](identity-privacy.md) | Permanent ID/QR, hidden phone, approved contact-change request |
| [Ranking and history](ranking-history.md) | Overall leaderboard, rank explanation, eligibility/reassessment, match history |

Screen IDs begin with `P-`. No World, social feed, game editor, peer-review, EXP, or separate MMR screens are specified.

Business source: [Player Information](../../../../business_logic/product/player-information/README.md).

## Reference prototype

[`app/mocksups-app/player-app/rotra-player.html`](../../../../../app/mocksups-app/player-app/rotra-player.html) (October 26, 2026) shows every surface above. Open it in a browser; sign in with `0917 555 0142` or `migs.santos@example.com` and any password. It uses the nine playing levels with no I–V steps.

Layout and copy choices it makes, recorded here as **proposals** (the business rules still decide behavior):

| Surface | Prototype choice |
|---|---|
| Navigation | One top bar: **Leaderboard** and **Sign in** / **My profile**. The leaderboard is the public home. |
| P-LEADERBOARD | Columns #, player, rank label. Positions 1–3 stand on a "Top three" podium above the list: a stage lit in the brand green with pixel-notched steps (2nd, 1st, 3rd, brightest for 1st), pixel-font numbers and an animated pixel fire behind #1. Motion stops for reduced motion. The list continues from #4. In search results, 1–3 keep medal styling on their rows. Search filters the ranked list by name or nickname; a full RTR ID opens that profile even if it isn't on the list, otherwise a neutral "Profile not found". 25 rows at a time with **Show 25 more**. A signed-in player sees their own position (with **Show my row**) or why they aren't listed. A "Who appears here" card states the current match requirement. |
| P-PUBLIC-PROFILE / P-OWN-PROFILE | Identity card (picture or initials, name, nickname, RTR ID with **Copy** and a note that it isn't the player's city or club) beside a shared-rank card: label, status chip, overall position or **No position**, and a nine-segment ladder. Then eligibility, recent games and About (playing style, experience, links). The owner also gets **Edit profile**, **My player ID** and a dashed "Your account · only you see this" panel with phone, email, phone-privacy state, **Privacy and contact** and **Sign out**. An optional, non-blocking "Add details" prompt appears when playing style or experience is empty. |
| P-RANK-DETAIL | A split bar for the configured weights, one paragraph each on club assessments and match performance, the nine levels with the player's marked, "Clubs set their own levels" and "When it changes". It says it doesn't list each club's assessment. |
| P-ELIGIBILITY | Shown on the profile as "*n* of *threshold* standard matches · last three months" with a progress bar; reassessment and below-threshold wording follow the ranking rules. |
| P-MATCH-HISTORY | Two tabs: **Singles and doubles** (counted) and **Fun and partial** ("kept in the record but don't count toward rank"). Games are grouped by session with date and club; a missing score reads "Winner recorded; score not entered"; an expired page reads "Session page no longer available". |
| P-ID-QR | Large QR holding only the ID text, the ID in large mono type, **Copy ID**, and a breakdown of each part of the ID. |
| P-PHONE-PRIVACY + P-CONTACT-REQUEST | One **Privacy and contact** page: the phone switch with a separate saved-state line, then contact details and **Request a change** (a sheet with Phone/Email, current value, new value and the Admin-approval notice). One open request at a time; its status shows as Waiting for review, Approved · being applied, Applied, Needs attention or Not approved. |
| P-EDIT-PROFILE | Sections in a left-hand menu (tabs across the top on phones): **Name**, **Playing style** (style and experience), **Links**, and **Account** (read-only phone, email and player ID, with **Request a phone or email change**). One draft and one **Save changes** cover all sections. A section shows a dot for unsaved edits and a count of fields to fix; saving with errors opens the first section that has them. |
| P-LOGIN, P-CONTACT-REQUEST | Phone input mask: once the field holds only phone characters, digits are grouped as typed (`0917 555 0142`, `+63 917 555 0142`). Email text is left as typed. The mask is display only; normalization still follows the identity rules. |
| P-CLAIM | Two steps: **Is this you?** (name, nickname, RTR ID, phone partly hidden as `+63 918 ••• ••77`) with **Yes, this is me** / **This isn't me**, then the registration form. The preset phone is read-only with a help hint. No password minimum is set; the confirmation must match. |

Placeholders for decisions that remain open (see [open decisions](../../open-decisions.md)): links are shown publicly; playing style is free text; fun and partial games appear in a separate history tab; the eligibility window is described only as "the last three months". The prototype's **Prototype** button, timers and fictional data are not product features.
