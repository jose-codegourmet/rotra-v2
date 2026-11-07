# Saved players, identity entry, roster, and presence

**Surfaces:** `Q-SAVED-PLAYERS`, `Q-ADD-PLAYER`, `Q-IDENTIFY`, `Q-ASSESS`, `Q-ROSTER`.

**Source:** [player entry rules](../../../../business_logic/product/queue/modules/players/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html).

## Q-SAVED-PLAYERS — Club player list

**Entry:** home sidebar **Saved players** (with count). Blocked by the license gate when expired.

Header “Saved players”, “N players this club has played with”, and the primary **Add player** (PageHeader action; on phones it follows the header layout). It opens Q-ADD-PLAYER with no session (see “From Saved players” below).

**Statistics carousel** (issue #301, verified October 31, 2026): between the header and filters,
show six cards in this order: **Total players**, **Total registered**, **Total beginners**,
**Total intermediates**, **Total advanced**, **New players this week**. Counts use all saved players
for this club, independent of search and filters. Registered means claimed; levels use the club's
playing-level band. Unknown levels contribute to the total but not a band.

“This week” starts Monday at 00:00 in **Asia/Manila** and runs through the current instant, inclusive.
Missing, invalid and future added dates do not count. The caption reads “All saved players · This week
starts Monday (Asia/Manila)”. Cards are 224 px wide, with 12 px gaps, 16 px padding, surface background,
strong border, rounded corners, muted labels and 32 px counts. Horizontal overflow stays inside the
carousel. Swipe/drag or use Previous/Next statistics buttons (44 px targets); the focused card viewport
also supports Left/Right arrow keys. At each end its corresponding control is disabled. The region
is named “Saved player statistics”; slides have their position and label. No automatic rotation;
reduced motion makes control navigation instant. All six zero values remain visible for an empty club.
Loading shows labelled placeholders; an error offers retry instead of misleading zero counts.

The mockup uses native horizontal scrolling; the real app uses Embla Carousel.

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

**Full profile dialog:** picture, identity chip and a plain status line; Nickname, Level suggestion, Registered in, RTR ID (small monospace), Added to club, Sessions here, Phone (“Hidden by player”, “None on file”, or “Kept private; confirmed in person when adding them to a session” — the number itself is never shown). Note: levels are set per session while preparing a roster; Saved players › Add player can also set the saved level. Footer: Close, and Invite where it applies.

**Invite to ROTRA (guests only, in the full profile dialog):** below the details, a short section: “Send this link so they can sign in to ROTRA Player. Their guest record isn't linked automatically.” with **Copy invite link** (toast “Invite link copied”; if the clipboard is blocked the toast shows the link) and **Share** (only when the browser supports sharing). Nothing is sent from ROTRA and no contact channel is assumed; registered and unclaimed profiles don't show it. The link targets the ROTRA Player login page (`player.rotra.club/login`) until player self-registration ships; signing in does not link or merge the guest record (see the identity rules).

**Edit details (guests and unclaimed profiles, November 8, 2026):** **Edit details** sits next to Invite in the profile dialog footer. The sheet has Full or display name, Nickname, Level for this club and Phone; unclaimed profiles add Email, Playing style, Experience (Years + months and Playing since, linked) and Links. A phone already on file is not editable (“On file and kept private. Not their number? Ask ROTRA to change it.”); a profile with no phone gets a typable field. **Save details** toasts “Details saved · NAME” and returns to the profile dialog. Unclaimed profiles show the note that these details fill in the player's registration. Registered players have no Edit details.

**Invite dialog:** “Invite NAME to ROTRA” (guest) or “Invite NAME to claim their profile” (unclaimed). Explains the account uses their phone and email, and that the link doesn't book a session. Shows the invite link with **Copy link** (“Invite link copied”). Offline: “Making an invite link needs an internet connection.” No in-app sending; the operator shares the link themselves. With saved data (November 8, 2026): an unclaimed profile's link is a real registration link (`player.rotra.club/claim/<token>`, 7 days, single use) and every opening of the dialog issues a new one; for now it does not cancel the link sent before (each expires after 7 days; TBD, November 8, 2026); a guest's link is the ROTRA Player login. If the link can't be made, the dialog closes with an error toast.

“Saved players” does not imply formal membership or an approval system. The page has no Reassess buttons, and name collisions show separate cards; never silently combine them.

No phone/email columns in the normal list. Contact display, where permitted for confirmation, remains deliberate and restricted; hidden phone values cannot appear in search snippets.

## Q-ADD-PLAYER — Search/add to roster

**Entry:** **Add player** in preparation, **Add late player** in the console's Players view, or **Add player** on Saved players. Sheet **Add player**, opening with “Adding to **TITLE**.” — in a live session adding “Late players get a level now, and it locks for the rest of the session.” From Saved players it opens with “Adding to your saved players. They won't be added to a session.”

**From Saved players (no session).** One `AddPlayerSheet` in its club context; it saves to the club's saved players only and never creates a roster or waitlist row. Tabs are **Player Information** (default) and **New player**; the Saved players tab is hidden because everyone there is already saved. There are no slots, waitlist or live notices. **Level for this club (optional)**: it becomes the saved player's level (the Beginner / Intermediate / Advanced statistics count it); left empty, they are saved with no level yet. The primary reads **Save player**. A Player Information profile the club already saved is refused with “NAME is already in your saved players.” and the sheet returns to the list; a new player whose phone matches a saved player's private phone is refused the same way. Same-name guests are never merged. Saving updates the header count and the statistics (Total players, Total registered for profiles, the level band when a level is set, New players this week). Toasts: “NAME saved as a guest”, “NAME saved · profile lookup after sync” (phone given), “NAME saved · Intermediate Mid” (Player Information). Offline, a new player saves on this device; the Player Information tab shows its offline notice. Saving without a session is mock-only for now (no club player endpoint yet).

**Stays open while adding.** Adding a player never closes the sheet: it returns to the same tab, cleared (search or the new-player form emptied, focus back in the first field), with a success line such as “Marco Lopez added · Intermediate Mid” and, from the second add on, “· N added so far”. The footer button reads **Cancel** until someone is added, then **Done**. The slots meter and waitlist behind it update as players are added.

Segmented tabs:

| Tab | Contents/behavior |
|---|---|
| Saved players (default) | Search “Name, nickname or RTR ID”; rows with picture, name, RTR ID or “Guest”, identity chip. Players already in the session (roster or waitlist) are **left out of the list**, not shown disabled; a line above it says “N saved players are already in this session and not listed.” When everyone saved is already in: “Every saved player is already in this session. Add someone new or search Player Information.” Empty: “No saved player matches. Try Player Information or add a new player.” Works offline |
| Player Information | Online only. Search “Name or RTR ID”; rows with RTR ID and rank (“Rank 214”, “Not ranked yet”). Players the club already saved are not repeated. Footer: “Results only suggest people. Confirm with the player before linking.” Offline: “Player Information search needs internet. Add them as a new player now; their profile can be linked after you reconnect.” |
| New player | Full or display name (required), Nickname (optional), Phone (optional, hint: “Without a phone they're saved as a guest. With one, ROTRA can match or create their profile when the session syncs.”), Level |

Picking a saved or Player Information player shows a confirmation card: picture, name, RTR ID or “Guest · no RTR ID”, identity chip, “Phone hidden by player. Use their RTR ID or QR code instead.” when hidden, “Player Information suggestion: LEVEL” or “None yet”, and **Level for this club** (“(locks immediately)” when live), preset to the suggestion. Player Information picks also require Q-IDENTIFY. Actions **Back** and **Confirm player slot**.

During preparation, when every slot is taken, the sheet warns “All 24 slots are taken. New players go on the waitlist as #N. You can give them a slot later.” and the button reads **Add to waitlist**; the player is added to the waitlist with their level instead of the roster. During an active Queue Session the Queue Master can admit a player directly even when the budget is full; they join present and with their level locked.

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

- **Preparation** ([Q-PREPARE](session-setup.md#q-prepare--session-preparation-overview)): picture, name, identity chip, suggestion, level indicator (may be too high / too low / matches suggestion), level select, Present switch, remove ×; **Mark all present**. New players start not present. Removing hides the player at once (counts update with it), ignores repeat taps for that player, and puts them back with an error toast if the removal is refused.
- **Live console** ([Q-POOL](session-console.md#q-pool--players-view)): picture, name, locked level, games against minimum, wait time, status, Present switch. Late players start present. There is no remove action during a live session.

**Group by Skill group** (All tab only) shows a **Skill mix** bar above the groups: label left, player total right ("11 players", or "No players yet" with an empty track), then one 8 px stacked bar with a segment per skill group sized by head count (Beginner, Intermediate, Advanced, and No level only while someone has none; empty groups are left out), and a wrapping legend of dot + name + count. Counts come from the same players the groups show, so it follows level edits, adds and removals. The bar is `role="img"` with a spoken summary; the legend carries the numbers so color is never the only signal.

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

The mock Queue app now wires active admission through the same saved, directory, new-player and join-request paths as preparation. The live slot meter is advisory; any selected waitlisted player can be admitted. Counts and public participant projections refetch after changes. The in-memory working copy resets on reload; it is not durable offline storage.

### Instant presence switches (#324, owner decision November 1, 2026)

Preparation and live Players use the same optimistic presence overlay and 800 ms background batch. Switches, status and counts update together, without disabling the grid. On/off reversals within a window produce no write. The batch carries wanted end states, uses one Roster sync entry and one summary toast (“N players marked present, M away”, omitting zero groups; singular “1 player marked present” / “1 player marked away”), with a unique waiting-match attention count when turning players away. A failure shows the existing error once and rolls back only failed revisions, preserving later taps. Pending cards say “Saving presence…”. In live filters, cards leaving the filter retain their position until settlement or a filter/sort change.

Flush before tab changes, adding players, Make match, and every other roster write (including level, removal, admission and bulk presence operations), as well as hiding/leaving the page. Mark everyone present/absent itself retains its current behavior. The shared DebouncedBatch/useDebouncedBatch helper is reusable by payment ticket #300; payment switches are outside #324. Pending UI state is transient, not durable offline storage.
