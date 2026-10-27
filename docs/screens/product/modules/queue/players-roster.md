# Saved players, identity entry, roster, and presence

**Surfaces:** `Q-SAVED-PLAYERS`, `Q-ADD-PLAYER`, `Q-IDENTIFY`, `Q-ASSESS`, `Q-ROSTER`.

**Source:** [player entry rules](../../../../business_logic/product/queue/modules/players/README.md). **Reference:** [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html).

## Q-SAVED-PLAYERS — Club player list

**Entry:** home sidebar **Saved players** (with count). Blocked by the license gate when expired.

Header “Saved players”, “N players this club has played with”.

**Tools row:** Search (“Name or nickname”; RTR IDs also match) and four filters:

| Control | Options |
|---|---|
| Skill level | All levels, Beginner, Intermediate, Advanced, No level yet (by the Player Information suggestion's band) |
| Registered in | Anywhere, each city found in players' RTR IDs (e.g. Cebu City, Manila), Not registered yet |
| Added | Any time, Last 7 days, Last 30 days, Last 3 months, More than 3 months ago |
| Account | Everyone, Registered, Unclaimed profile, Guest |
| Right now | Anyone, Playing now, At the session, not playing, In the live session. The results line reads “Showing N of M · SESSION is live” or “… · No session is live right now” (then the other options are disabled). Cards of players in the live session show “● Playing · Court 1” (accent) or “● At the session” |

**Filter layout follows its container, not the screen** (CSS container queries on the filter bar): wide (over 1000 px of container) — search plus five filters in one row; medium (621–1000 px) — search on its own row, filters three across; compact (620 px or less, e.g. a phone or a narrow column beside the open nav) — two filters across, smaller 36 px selects with small uppercase captions; very narrow (340 px or less) — one column.

“Showing N of M” and **Clear N filters** when any filter is set.

**Contacts-style A–Z list.** Players are always sorted by name and grouped under a letter heading (A, B, C …, then # for names that don't start with a letter); each heading shows its count and stays pinned while its group scrolls. An **A–Z index rail** sits on the right edge (A to Z and #), pinned while scrolling; letters with no players are greyed out and disabled. Tapping a letter jumps to that group and moves focus to its heading. The rail follows the current filters, so it only offers letters that have matching players.

**Player card** (grid inside each letter group, two or more columns even on phones):
- Top area (one button that opens the full profile): large picture or initials with a status dot (green registered, amber unclaimed, grey guest or pending), name, nickname, and a level pill with three small bars showing the band (one Beginner, two Intermediate, three Advanced) and the full level, or “No level yet”.
- Meta lines: registered city with a pin icon (or “Not registered” / “Lookup after sync”), “N sessions here”, “Added DATE”.
- Footer: identity chip, and **Invite** for guests and unclaimed profiles.
RTR IDs are not on the cards. Empty: “No saved players match these filters.” with Clear filters.

**Full profile dialog:** picture, identity chip and a plain status line; Nickname, Level suggestion, Registered in, RTR ID (small monospace), Added to club, Sessions here, Phone (“Hidden by player”, “None on file”, or “Kept private; confirmed in person when adding them to a session” — the number itself is never shown). Note: levels are set per session while preparing a roster. Footer: Close, and Invite where it applies.

**Invite dialog:** “Invite NAME to ROTRA” (guest) or “Invite NAME to claim their profile” (unclaimed). Explains the account uses their phone and email, and that the link doesn't book a session. Shows the invite link with **Copy link** (“Invite link copied”). Offline: “Making an invite link needs an internet connection.” No in-app sending; the operator shares the link themselves.

“Saved players” does not imply formal membership or an approval system. The page has no Reassess buttons, and name collisions show separate cards; never silently combine them.

No phone/email columns in the normal list. Contact display, where permitted for confirmation, remains deliberate and restricted; hidden phone values cannot appear in search snippets.

## Q-ADD-PLAYER — Search/add to roster

**Entry:** **Add player** in preparation or **Add late player** in the console's Players view. Sheet **Add player**, opening with “Adding to **TITLE**.” — in a live session adding “Late players get a level now, and it locks for the rest of the session.”

**Stays open while adding.** Adding a player never closes the sheet: it returns to the same tab, cleared (search or the new-player form emptied, focus back in the first field), with a success line such as “Marco Lopez added · Intermediate Mid” and, from the second add on, “· N added so far”. The footer button reads **Cancel** until someone is added, then **Done**. The slots meter and waitlist behind it update as players are added.

Segmented tabs:

| Tab | Contents/behavior |
|---|---|
| Saved players (default) | Search “Name, nickname or RTR ID”; rows with picture, name, RTR ID or “Guest”, identity chip. Players already in the session (roster or waitlist) are **left out of the list**, not shown disabled; a line above it says “N saved players are already in this session and not listed.” When everyone saved is already in: “Every saved player is already in this session. Add someone new or search Player Information.” Empty: “No saved player matches. Try Player Information or add a new player.” Works offline |
| Player Information | Online only. Search “Name or RTR ID”; rows with RTR ID and rank (“Rank 214”, “Not ranked yet”). Players the club already saved are not repeated. Footer: “Results only suggest people. Confirm with the player before linking.” Offline: “Player Information search needs internet. Add them as a new player now; their profile can be linked after you reconnect.” |
| New player | Full or display name (required), Nickname (optional), Phone (optional, hint: “Without a phone they're saved as a guest. With one, ROTRA can match or create their profile when the session syncs.”), Level |

Picking a saved or Player Information player shows a confirmation card: picture, name, RTR ID or “Guest · no RTR ID”, identity chip, “Phone hidden by player. Use their RTR ID or QR code instead.” when hidden, “Player Information suggestion: LEVEL” or “None yet”, and **Level for this club** (“(locks immediately)” when live), preset to the suggestion. Player Information picks also require Q-IDENTIFY. Actions **Back** and **Confirm player slot**.

When every slot is taken, the sheet warns “All 24 slots are taken. New players go on the waitlist as #N. You can give them a slot later.” and the button reads **Add to waitlist**; the player is added to the waitlist with their level instead of the roster.

Errors: “Choose a level for this club before adding.”; “Enter a name.”; “Choose a level for this club.”

Success toasts: “NAME added” (+ “· level locked” when live), “NAME added as a guest”, or “NAME added · profile lookup after sync” (phone given).

A phone is optional for **session participation**, not for claiming a Player Information account. No phone means saved guest. A supplied phone makes identity matching/profile creation eligible on sync; do not promise an immediate permanent ID offline.

Email and socials may be collected as incomplete-profile enrichment, but missing email/socials cannot block a guest from playing. Facebook is a social link, never an authentication requirement.

CTA: **Confirm player slot** (proposed wording). Prevent adding the same known profile/club player twice to this roster. When a potential duplicate cannot be safely resolved, preserve the proposed entry for operator review rather than arbitrarily merging people.

Offline: use downloaded club records; add unexpected names/levels/optional phones locally. Mark global lookup/profile linking pending until reconnection. A loading spinner must not run indefinitely for an unavailable online lookup.

## Q-IDENTIFY — Confirm correct player

Shown, titled **Confirm player**, for every **unclaimed** profile, from the Player Information tab or the Saved players tab (e.g. Gab Torres); **Confirm player slot** stays disabled until one check is chosen. Tapping a registered (claimed) profile, or a saved player who has a level, adds them immediately with no dialog step, at their Player Information level; the toast names it (“Paolo Reyes added · Advanced Low”, or “… added to the waitlist as #N · LEVEL” when full). Players without a level still open the level step. Inside the confirmation card: “Confirm this is the right person — Check with the player using one of these. A name match alone isn't enough.” Three toggle buttons:

- **RTR ID matches**
- **Scanned their QR** (manual ID check is the fallback if the camera fails)
- **Phone confirmed** (only when the phone is visible to the club)

Choosing one shows “✓ Identity confirmed with the player” and enables **Confirm player slot**.

Hidden phone: display “Phone hidden by player,” not a reveal button or masked fragments sufficient to undo the preference. Use ID/QR without demanding the hidden number.

After scanning, show the resolved candidate for confirmation; scanning does not automatically claim an account, book a slot, or grant edit rights. If offline and the ID is not in downloaded records, say it cannot yet be verified and use the permitted pending entry workflow. No fake verified badge.

Error states: no match, multiple name matches, invalid ID, unavailable camera, identity already in roster, phone/profile conflict, offline lookup. Each returns to a correctable selection rather than replacing another player.

## Q-ASSESS — Club level selection

Display “Player Information suggestion” when known and a separate “Level for this club/session” control. Operator judgment wins; a lower selection is allowed without an invented approval gate.

The list has nine options, grouped:

| Group | Options |
|---|---|
| Beginner | Beginner Low, Beginner Mid, Beginner High |
| Intermediate | Intermediate Low, Intermediate Mid, Intermediate High |
| Advanced | Advanced Low, Advanced Mid, Advanced High |

Group the selector by Beginner / Intermediate / Advanced and always show the full label (e.g. “Intermediate Mid”). Do not derive a level automatically from a guest's self-declared band without the operator choosing it (a join request only pre-selects the middle level of the stated group).

Before session start: operator can assess/reassess through preparation. Accepted changes affect shared rank immediately when synced. After start: existing player level is locked, with explanatory text, no edit path. Late arrival: assign on addition and immediately lock for the remainder.

Years/months of experience, if present, is optional context, not a ranking multiplier.

## Q-ROSTER — Confirmed slots and presence

The roster appears in two places:

- **Preparation** ([Q-PREPARE](session-setup.md#q-prepare--session-preparation-overview)): picture, name, identity chip, suggestion, level indicator (may be too high / too low / matches suggestion), level select, Present switch, remove ×; **Mark all present**. New players start not present.
- **Live console** ([Q-POOL](session-console.md#q-pool--players-view)): picture, name, locked level, games against minimum, wait time, status, Present switch. Late players start present. There is no remove action during a live session.

Separate slot confirmation from presence; being listed is not proof of arrival.

The Present switch controls automatic pairing eligibility. It is not a menu of Resting/Eating/Prepared statuses. Turning someone unavailable marks affected future matches Needs attention. It must not cancel an active game, free their court, or remove their ongoing participation silently.

The confirmation toast states the count: “Kat is not present · 2 waiting matches need attention”. Repair happens in the Queue view (edit lineup or Regenerate). When a player's active game needs a substitution, use the explicit match-control flow.

Late player addition uses Q-ADD-PLAYER. The operator can add arrivals mid-session, including offline. An identity lookup delay does not prevent permitted guest/local participation.

Returning incomplete profile: offer the registration link path online and optional enrichment. Link issuance is not an email-send action unless a delivery method is separately authorized/designed. An offline screen cannot mint a valid server claim link; explain the pending requirement.

## Acceptance examples

- A name-only guest appears in the club list next time without a global account.
- A hidden phone is never exposed by ID search or QR preview.
- A late entrant cannot change their level after being added to the running session.
- Presence changes flag future lineups without terminating an active game.
