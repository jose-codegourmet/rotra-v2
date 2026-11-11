# Open decisions before implementation

> **November 8, 2026:** The owner decisions in [Offline operation and recovery](queue/modules/offline/README.md) supersede conflicting earlier offline, device, finalization, payment and conflict rules below. Late-record recovery and implementation details remain open.


**Last verified:** 2026-11-07 for player login mapping and claim-link rules (#244); 2026-11-06 for the On court step, court filling, substitution game credit, times and days, and the connection rules for Cancel session and the court switch; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Deliberately unresolved. These are not additional approved requirements and are not a new questionnaire. Updated October 26, 2026: items the [ROTRA Queue prototype](../../../apps/mockup/queue-app/rotra-queue.html) settled are listed under [Settled by the prototype](#settled-by-the-prototype). Updated October 27, 2026: items the platform owner settled with the [ROTRA Admin prototype](../../../apps/mockup/admin-app/rotra-admin.html) are listed under [Settled by the Admin prototype](#settled-by-the-admin-prototype).

The product direction is sufficiently defined for documentation. Resolve the relevant items during focused design of each module, rather than reopening the whole business interview. Existing code or old docs must not silently supply answers where they conflict with v1.

## Implementation blockers

| Area | What remains unresolved | What is already fixed |
|---|---|---|
| Numerical ranking | Rating constants (band edges, step sizes) and worked examples, #247 | **Settled November 11, 2026 ([D-2026-11-11-05](../../mvp/decisions.md#d-2026-11-11-05)):** rating by wins weighted by who you beat; seeded from the first level for the night; assessments have zero influence after that; Provisional ~10 games; 90 rolling days, Asia/Manila midnight; recompute on settings save; ties by games in window, then name; score margin ignored |
| Queue generation | Nothing for v1 | **Settled November 11, 2026 (D-05):** the prototype's draft weights are the official v1 pairing rule; operator picks 2/3/4/6 per run; minimum-game priority; manual overrides |
| Offline completeness | How devices know required records exist; detection of gaps; second-device prerequisites; duplicate prevention; device handoff | Original records must be recovered; second device may continue; no offline finalization or manual reconstruction |
| Conflicting confirmed results | How operator clarification chooses authoritative records without providing general edits to locked winners | Confirmation is permanent; sync conflicts require review |
| Identity matching | Canonical phone representation, concurrent new-profile creation, duplicate resolution, mistaken links, hidden-phone lookup by clubs | Phone uniquely identifies profiles; name alone does not; ID/QR supports private numbers; phone is not a sign-in identifier (email only, decided 2026-11-08) |
| Claim and recovery links | Failed provider application recovery beyond "Application failed" | **Settled November 11, 2026 ([D-2026-11-11-08](../../mvp/decisions.md#d-2026-11-11-08)):** links last **24 hours** (was 7 days), single use, reissue revokes the old one; no email verification on claim; password at least 8 characters; a wrong claim is not undone (the Queue Master creates a new player); name-only guests invited once a contact is added. Email + password login; recovery by email via Admin review |
| Contact-change approval | Evidence needed, enforcement across direct provider APIs, request UX, notifications, contact conflicts. Approve / Retry application / Check status run in real mode (#575, November 8, 2026) | Owner manually approves; player cannot directly edit phone/email; RTR ID permanent |
| Window boundaries | Nothing | **Settled November 11, 2026 (D-05):** 90 rolling days; Asia/Manila midnight; RTR date is the first sync day |

## Remaining product details

| Area | Open detail |
|---|---|
| Licensing | Refund policy, offline entitlement mechanism | **Settled November 11, 2026 ([D-2026-11-11-06](../../mvp/decisions.md#d-2026-11-11-06), [D-07](../../mvp/decisions.md#d-2026-11-11-07)):** terms stack (a renewal starts the day after the current term), no start-date field; forgotten club password is a request the platform owner answers with a temporary password |
| Closing a session | Final policy for games still in play (v1 blocks Session done while any match is Playing, until it is finished or invalidated); whether unplayed waiting matches are kept anywhere (they are dropped from results, and On court matches that never started are dropped the same way, settled November 6, 2026); when an invalid session releases the active-session slot |
| Mid-session settings | Whether mode, formats, or the minimum can change after start; they stay fixed until decided |
| Invalid-session recovery | Whether later recovery of the original device can reopen an already-invalid session; original records are mandatory in every case |
| Assessment timing | Nothing | **Settled November 11, 2026 (D-05, D-06):** the level for the night never feeds shared rank after a player's first night; a level saved for a roster player removed before start is dropped |
| Guest linking implementation | Who confirms a historical guest identity, what evidence is required, and how mistaken/duplicate links are resolved; including earlier games after identity confirmation is settled below |
| Session standings | Three-or-more-way ties, conflicting head-to-head results, and identical names; do not replace the agreed wins/losses/head-to-head/name order |
| Awards | Nothing for v1 | **Settled November 11, 2026 (D-05):** the prototype Most Improved / Off Day formula is approved as is for v1; five prior club sessions within the window and at least two counted games for MVP stay fixed |
| Publication withdrawal | Nothing | **Settled November 11, 2026 ([D-2026-11-11-09](../../mvp/decisions.md#d-2026-11-11-09)):** no Unpublish; re-publishing with a new selection is the only change |
| Financials | Currencies other than pesos; automatic stock deduction; whether inventory edits work offline | **Settled November 11, 2026 (D-06):** shuttle unit cost snapshotted at save; paid mark survives demotion; payments can change after Session done |
| ID allocation | Sequence beyond four digits | **Settled November 11, 2026 (D-07, D-08):** six v1 cities, the platform owner adds cities from Admin; first-come sequence from the database; RTR ID is display only and never changes on a city correction |
| Profile editing | Exact personal fields and social visibility; whether operator edits of personal information continue after a profile is claimed |
| Club-set pictures at claim | What happens to the picture a club set for an unclaimed profile (or a guest) when the player claims or registers. Proposal: it becomes their starting picture, which they can change (owner request, November 9, 2026; [log](../../mockup-changes/2026-11-09-queue-club-set-player-pictures.md)). Also: where a guest's club-set picture is stored |
| Profile visibility and the public club page | Whether the Queue Master of a session sees an always-private player's name (the prototype copy says so; the decision records only that picture and banner stay public); how existing private-profile settings map to the three levels; the default banner when the owner hides or deletes it | **Settled November 11, 2026 ([D-2026-11-11-11](../../mvp/decisions.md#d-2026-11-11-11)):** Public · Private · Always private (default Private), **Hide me from Player Information**, predefined banners managed in Admin with no uploads, Share profile, and the public club page (epic P07). Timing of the club page for MVP is not decided |
| Expired-page behavior | Meaning/presentation of stale public pages; restoration after deletion | **Settled November 11, 2026 (D-09):** no time limit while licensed; never indexed or static; join requests, logs and exports kept 90 days |
| Admin configuration | Which flags exist, targeting, and when offline devices pick up a flag change | **Settled November 11, 2026 (D-05):** saving ranking settings recomputes every rank from the game facts |

## Settled by the product owner on November 11, 2026

Recorded as [D-2026-11-11-04](../../mvp/decisions.md#d-2026-11-11-04) to [D-2026-11-11-10](../../mvp/decisions.md#d-2026-11-11-10) (offline writes, ranking by wins, roster payments and license terms, club sign-in and cities, accounts and 24-hour links, public pages and 90-day retention, housekeeping). The tables above carry the one-line summaries; the modules carry the rules.

**Queue rules, approved with the prototype on November 11, 2026 ([D-2026-11-11-11](../../mvp/decisions.md#d-2026-11-11-11)).** Settled: Bagging mode (doubles only, session-wide switch, pairs by ALL or game numbers up to the minimum, pair beats fairness, court capacity beats pair, Generate matches only; [Queueing](queue/modules/queueing/README.md#bagging-mode-and-bagging-pairs)); stepping down to the waitlist, overfilling with one confirmation and expected games recomputed on every roster change ([Players](queue/modules/players/README.md#slots-and-waitlist)); join requests closing at Start, so a request during play no longer exists (this **overrides** the during-play parts of [D-2026-11-11-02](../../mvp/decisions.md#d-2026-11-11-02) in [Players](queue/modules/players/README.md#join-requests-from-the-session-link)); a court's end time and label editable while a match is on it ([Sessions](queue/modules/sessions/README.md#running)); court times and the join link in the Facebook post. Still open: standings for a stepped-down player's finished games; the fate of a bagging pair when a player leaves the roster; whether a pair outranks the minimum-games priority.

## Settled by the product owner on November 7, 2026

Player login mapping and claim links ([#244](https://github.com/jose-codegourmet/rotra-v2/issues/244), F07.3). Club username sign-in and platform-owner sign-in are unchanged by this decision.

| Area | Decision |
|---|---|
| L1 · Account mapping | A player's auth account is keyed by **email + password**, and players sign in with **email + password only**. No phone provider, no SMS. *Changed 2026-11-08 by the owner:* phone is **not** a login identifier (the earlier phone-lookup sign-in is withdrawn); phone stays a contact and the profile-matching key for clubs |
| L2 · Email required | Every player account has an email (already required at claim). Password recovery stays email-only |
| L3 · Generic failure | A failed sign-in never reveals whether an email exists or whether the profile is registered |
| L4 · Identity ≠ auth | The global player identity stays independent of the auth identity. The player profile links to the auth user; the auth user is not the player identity |
| L5 · Claim links | Valid **7 days**, **single use**. The club (Queue Master) can **reissue**; reissuing invalidates the previous link (the database allows one active link per player). Expired or used links show the existing expired/used state. *November 8, 2026:* keeping earlier links alive was tried and withdrawn the same day; it would need a migration dropping `player_claim_links_one_active_per_player` |
| L6 · Contact collisions at claim | If the phone or email already belongs to another account, **block** and show the contact-support route. Never merge silently |
| L7 · No claim by ID or name | An RTR ID or a name alone can never claim an account |

Still open after this decision: email verification on claim; password policy and complexity; contact-change enforcement across direct provider APIs and its approval evidence; RTR ID location/date/sequence rules and simultaneous allocation; mistaken or duplicate guest links and permanent relink; audit lines for a failed or retried contact-change application in real mode. Decided November 8, 2026 (#575): Approve reviews (rechecks revision and collisions, reserves the value) then applies; applying sets the Supabase login email for a registered player, reads it back, and only then updates the private contact and marks Applied; any failure is Application failed; Retry reuses the same operation ref; Check status reconciles; an unclaimed player has no login, so only the contact changes. Guest registration is settled by #490 below; separate linking remains open.

## Settled by the product owner on November 6, 2026

Recorded in the [mockup change log](../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md).

| Area | Decision |
|---|---|
| D1 · Generator name | The draft generator (five strategy tabs, drafts, transfer to Main Queue) is renamed **Generate matches** in all user-visible copy; behavior unchanged. Code names (`AutoQueueMode`, `AutoQueueCount`, `Q-AUTO`) stay until the real-app ticket |
| D2 · On court step | Lifecycle: Waiting → **On court** (placed on a court, not started) → **Playing** (after **Start match**) → Done / Invalid. On court allows switching sides and replacing players as plain lineup changes; Playing allows only **Substitute**. Buttons stay **Start match** / **Match done** |
| D3 · On court rules | On court players are busy ("Migs is on Court 1"). The timer starts at Start match. Start match is one tap with a presence/busy recheck ("Something changed. Review the match again."). A not-present player disables Start match until fixed or sent back. **Send back to queue** (to the top) and **Move to another court** (free open court; two for 5v5). Added the same day: **Swap with the queue** — the next ready match takes the court, and the On court match takes its queue place. Regenerate and Generate matches never change On court matches. Removing a court is blocked while a match is on it; editing its end time and label is allowed since November 11, 2026 ([D-2026-11-11-11](../../mvp/decisions.md#d-2026-11-11-11)). An edited match sent back is protected |
| D4 · Court filling | Per-session **Manual Queue \| Auto Queue** switch, starting on Manual, changeable any time. Auto places the next eligible match On court and **never starts it**. Fills on: switch on (all free open courts, in court order), Match done or invalid, a court freed by Move, a match added while a court is free, a court opening or added. Skips 5v5 and courts not open yet; a court whose booking ended still fills, because the end is only a reminder. Send back refills with a different match. Turning Auto off leaves On court matches in place. The queue card's origin label for generated matches reads **Generated** (was Auto) |
| D5 · Substitution game credit | For a Playing match only, **Who gets this game?**: Nobody (default) · the incoming player · the outgoing player; never both, at most one person per slot. The credited player gets game count, minimum credit and win/loss in the live leaderboard, standings and session awards; **never long-term performance or rank**. Locks at Match done or invalid; an invalid match gives nobody anything |
| D6 · Court card look | Free: plain card, chip **Free** (or "Not open yet"). On court: normal border, chip **Getting ready**, **Start match** primary. Playing: steady accent border glow (no pulse), chip **Playing**, minutes. Never color alone; tokens only |
| D7 · Session done | Still blocked while any match is Playing. On court matches that never started are dropped like waiting matches, with "N matches on court weren't started and will be dropped." |
| D8 · Court switch offline | The **Manual Queue \| Auto Queue** switch needs internet. While the device is offline, auto filling pauses: no automatic placements, so two offline devices can't collide through Auto Queue. Manual **Put on court** keeps today's offline behaviour (Jose, November 6, 2026) |
| D9 · Credit and award baselines | Most Improved and Off Day baselines from earlier sessions use **full games only**: a credited substitute's game never enters them, like rank (Jose, November 6, 2026). Whether it counts toward the current session's Off Day stays open below; until then it doesn't |

Still open after this decision:

- Offline: two devices placing the same match by hand or using the same court while disconnected. Collision-free assignment across offline devices stays part of [offline completeness](#implementation-blockers).
- Whether Generate matches' **Available Players** strategy treats players in an On court match as "in play" (D3 makes them busy; the generator rule was written before On court existed).
- Whether a credited substitute's game feeds **Off Day** (D5 names standings and session awards).

### Times and days

Recorded in the [mockup change log](../../mockup-changes/2026-11-06-queue-time-and-day.md). The live header
had read "Started 10:42 PM · Ends 9:00 PM" for a session planned 6–9 PM and started late.

| Area | Decision |
|---|---|
| T1 · One date-and-time picker | Every time field (session start/end, court planned start and end in setup and Add / Edit court, new end at Start session, live end) uses day buttons plus times in 15-minute steps (since November 8, 2026: a time field that opens a dialog with AM/PM, hour and minute buttons instead of one list). Day buttons appear only when the field can fall on more than one day. Only valid times can be picked; an existing off-grid value stays so it can be kept. No silent "next day" guessing |
| T2 · Changes after start | The end can be set to any time after now, later or earlier (up to 24 h after play began); **Extend 30 min** / **Extend 60 min** stay as shortcuts. Courts that follow the session end move with it. Court times keep their existing rules. The start time is fixed: "Start time is fixed: it records when play began." |
| T3 · Late or other-day start | Starting after the planned end, or on another calendar day than planned, needs a **New end** first, pre-filled with now + the planned length rounded up to 15 minutes; Start is disabled until it is after now |
| T4 · Every time shows its day | Today: "9:00 PM". Yesterday / tomorrow: "Yesterday 10:42 PM" (lower-case mid-sentence). Further: "Sat, Nov 1 · 9:00 PM". A range ending the next day: "7:00 PM–1:00 AM · next day". Plain times are fine next to a shown date |
| T5 · Overdue reminder | Live header shows "N left", then "Planned end passed N ago" (warning color, never color alone), with a console banner offering **Set end time** and **Session done**; the dashboard live card says the same. The session never closes by itself |
| T6 · Whose clock | Times are shown and entered in the club's time zone (Asia/Manila for v1), not the device's. Docs rule only; the prototype assumes device time is club time. The rank-window and ID-date timezone above stays open |
| T7 · Minimum games | The minimum games stay fixed from the planned window: a new end at Start session or Set end time doesn't change them (Jose, November 6, 2026) |
| Booking ended on busy courts | A court with a match on it shows **Booking ended** in the warning style once its end passes, like a free court (was always "Until …") |

### Cancelled sessions

Recorded in the [mockup change log](../../mockup-changes/2026-11-06-queue-example-sessions-and-cancel.md). The
owner asked for example sessions on the Queue dashboard; the cancelled example needed a status that didn't exist.

| Area | Decision |
|---|---|
| C1 · New status | **Cancelled** is a new session status, not Invalid. Invalid: the session ran but its records can't be trusted. Cancelled: it never ran |
| C2 · When | Only a prepared session, only before **Start session**. **Final**: no undo; to play anyway, create a new session |
| C3 · Confirm | "Cancel SESSION TITLE?" with date and time, joined and waitlist counts, a paid warning when any are marked paid, an optional **Reason**, and "This can't be undone." **Keep session** / **Cancel session** |
| C4 · Records and money | Roster, waitlist and payment marks are kept on a read-only session record. Refunds happen outside ROTRA; ROTRA records none. Payment marks can't change after cancelling |
| C5 · Public page and requests | Public page: **Cancelled** + the reason, no join card. Pending join requests close |
| C6 · Counts | Counts nowhere: no games, standings, slides, minimum, player records or rank. Ignored for venue and time clashes |
| C7 · Short on players (live) | Banner + honest courts: "7 players present: enough for 1 doubles court. 3 sit out each game." and "Not enough free players." on a free court that can't get a match |
| C8 · Connection | **Cancel session needs internet**, like Delete session. It is never saved offline to sync later (Jose, November 6, 2026). Pending join requests move to their own **closed** status, distinct from declined |

## Settled by the product owner on November 1, 2026

| Area | Decision |
|---|---|
| Live preparation access (#323) | Option 1: read-only Session settings with links to existing live controls. Mode, formats, minimum and levels remain fixed after start. Mid-session editing remains unresolved above. |

## Settled by the product owner on October 28, 2026

| Area | Decision |
|---|---|
| Profile sync timing | Match an existing profile or create the phone-linked profile and permanent RTR ID as soon as the entry successfully syncs. Do not wait for Session done. Match performance still requires valid session finalization. |
| Earlier guest games | After the guest's identity is confirmed, include their earlier valid games in personal history and ranking under the existing counting and rolling-window rules. Keep club history and permanent outcomes intact; do not count a game twice. Identity-confirmation evidence and mistaken-link handling still need specification. |
| Real-data rollout | Private online testing may come first. Offline operation and recovery remain required before clubs use ROTRA live. |

## Settled by the prototype

These were open or unspecified before October 26, 2026.

| Area | Decision |
|---|---|
| Fun-format courts | 1v2, 3v3, and 4v4 use one court; 5v5 uses two courts shown as one merged area |
| Partial participation | Substituted-out and substituted-in players get no win, loss, game, or award credit from that match anywhere. **Amended November 6, 2026:** unless the Queue Master gives the game to one of them (session credit only, never long-term performance); see below |
| Manual-only sessions | Allowed with both standard formats off; only manual fun games are possible |
| Disabled standard formats | Cannot be added manually either |
| Suggest protection | An accepted, unedited suggestion is not protected; editing it protects it |
| Removing roster players | Allowed during preparation; not during a live session (turn presence off instead) |
| Courts during play | Free courts can be removed (at least one stays); new courts can close before the session ends |
| Queue order | A suggestion; any ready match can start on any free court |
| Minimum games | Calculated from courts, length, players, and formats by default; operator can override |
| Session costs | Optional estimate and club inventory are v1 scope; payment collection is not (a paid / not-paid checklist is, below) |
| Public minimum | The public Details tab shows the minimum games per player |
| Re-publication | Allowed; Off Day starts unselected every time |
| Standings with no games | Players with no counted game are not listed |
| Payment tracking | A manual paid / not-paid checklist per session, part of Financials; no collection, receipts or contact details |
| Session capacity | Slot budget = players per court (club default 8) × courts; extra players join an operator-managed first-come waitlist |
| Club identity edits | The club changes its logo directly; a name change is a request approved by the platform owner in Admin; founding address and city code stay fixed |
| License payment history | Visible to the club in Club settings with CSV export; payments still happen outside ROTRA |
| Payment per player | The full amount each player pays: break-even by default, or a custom amount; the estimate shows profit or loss |
| Entrance fee | A misc per-head cost listed for transparency and included in the total; never the amount a player owes |
| Budget changes in preparation | First come, first served: players beyond a reduced budget move to the front of the waitlist in the order they joined; added slots fill from the waitlist |
| Identity check when adding | Only unclaimed Player Information profiles need RTR ID / QR / phone confirmation; registered (claimed) profiles are added in one tap at their Player Information level |
| Club password | The club changes it with the current password; the platform owner resets a forgotten one |
| Club settings offline | Unavailable offline |
| Themes | Light and dark both ship; dark default; a top-bar switch remembered per device |
| Playing levels | Nine: Beginner, Intermediate and Advanced, each Low, Mid and High; the I–V subdivisions are dropped |
| Session setup length | Three pages; only page 1 (date, venue, courts) is required and Create session works from any page |
| Guest join requests | Guests request a slot from the session link with a quick form; the Queue Master confirms (with a level) or declines each; confirmed guests take a slot or the waitlist; requests can be turned off per session |

## Settled by the Admin prototype

Decided by the platform owner on October 27, 2026, while reviewing the [ROTRA Admin prototype](../../../apps/mockup/admin-app/rotra-admin.html).

| Area | Decision |
|---|---|
| Club onboarding | The platform owner adds each club in Admin (**Add club**): name, fixed founding address and city (which sets the RTR city code), the club's username, an initial password the owner hands to the club, and its price. There is no club application flow |
| License prices | No fixed price. Each club has its own monthly and yearly price, set when the club is added and changeable later. The yearly price must be less than twelve months at the monthly price |
| Free tester clubs | A club can be set to Free instead of a price, for example a tester club. It still gets license terms, so expiry and retention work the same; each term is recorded at ₱0 and shown as Free |
| License amount | Activation and renewal fill in the amount from the club's current price for the chosen plan; the platform owner can still change it. Changing a price never changes payments already recorded |
| Feature flags | The platform owner creates flags in Admin: a name, a key the apps check (suggested from the name and fixed once saved), a description of what it does, and whether it starts on (off by default). The catalog starts empty |

## Not open for accidental reversal

- World is v2; do not brainstorm or design it in this v1 work.
- One club login/operating authority and one active session per club.
- Session fees and club-license payments are collected outside ROTRA. The cost estimate helps set a fee and the payments checklist records who paid; ROTRA never moves money.
- Session slots are operator-managed. Guests may send a join request from the session link, but a request never holds or takes a slot; only the Queue Master's confirmation does.
- No public Matches/Chat tabs and no required spectator live connections.
- Results and invalid-match decisions are permanent after confirmation, including for Admin.
- No reconstructing permanently lost offline results.
- No session finalization or final result slides offline.
- Reassessment occurs during roster preparation; no mid-session level changes.
- Off Day is private unless explicitly shared.
- Expiry deletion affects public pages, not player match history/earned rankings.
- Do not import old MMR, EXP, six-dimension peer-rating, cost-splitting, or umpire rules as defaults.

## Settled by the product owner (October 31, 2026)

Queue prepared capacity, individual court windows, Auto Queue generation (now called Generate matches) and draft transfer are recorded in [the owner review](../../decisions/2026-10-30-queue-flexibility/05-owner-review.md). Pairing weights, money and ranking formulas remain open where previously recorded.


## Guest registration settled on November 8, 2026 (#490)

A name-only guest invitation opens registration. Creating an account leaves the club guest record
unlinked until a separate linking invitation is accepted. Contact matches ask whether the existing
account is theirs before creating any duplicate: Yes requires sign-in/email recovery; No allows
contact correction or contacting ROTRA. A match or a Yes answer never proves ownership or links
history. Unclaimed profiles retain their existing claim-link flow. Separate guest-link invitation
verification and mistaken-link resolution remain open.
