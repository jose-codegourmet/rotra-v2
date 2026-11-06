# Open decisions before implementation

**Last verified:** 2026-11-06 for the On court step, court filling, substitution game credit, times and days, and the connection rules for Cancel session and the court switch; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Deliberately unresolved. These are not additional approved requirements and are not a new questionnaire. Updated October 26, 2026: items the [ROTRA Queue prototype](../../../apps/mockup/queue-app/rotra-queue.html) settled are listed under [Settled by the prototype](#settled-by-the-prototype). Updated October 27, 2026: items the platform owner settled with the [ROTRA Admin prototype](../../../apps/mockup/admin-app/rotra-admin.html) are listed under [Settled by the Admin prototype](#settled-by-the-admin-prototype).

The product direction is sufficiently defined for documentation. Resolve the relevant items during focused design of each module, rather than reopening the whole business interview. Existing code or old docs must not silently supply answers where they conflict with v1.

## Implementation blockers

| Area | What remains unresolved | What is already fixed |
|---|---|---|
| Numerical ranking | Skill-label mapping; normalization of the two components; performance calculation; score influence; handling sparse/absent recent data; global ties | 70% equally weighted latest club assessments, 30% performance; last three months; operator-assigned local levels are authoritative |
| Queue generation | Final team-strength/probability model; meaning of level-matched/easy in numbers; mode and fairness weights; default number of matches per Generate matches run (formerly called Auto Queue) | Shared queue, operator starts, minimum-game priority, flexible Chill/Fair targets, manual overrides; operator picks 2/3/4/6 per run; the prototype heuristic is the reference |
| Offline completeness | How devices know required records exist; detection of gaps; second-device prerequisites; duplicate prevention; device handoff | Original records must be recovered; second device may continue; no offline finalization or manual reconstruction |
| Conflicting confirmed results | How operator clarification chooses authoritative records without providing general edits to locked winners | Confirmation is permanent; sync conflicts require review |
| Identity matching | Canonical phone representation, concurrent new-profile creation, duplicate resolution, mistaken links, hidden-phone lookup | Phone uniquely identifies profiles; name alone does not; ID/QR supports private numbers |
| Claim and recovery links | Issuance/delivery, expiration, one-time use, email verification, unclaimed-account behavior, lost access to contacts | Club supplies registration link; phone and email required; phone/email + password login; recovery by email |
| Contact-change approval | Evidence needed, request UX, notifications, contact conflicts | Owner manually approves; player cannot directly edit phone/email; RTR ID permanent |
| Window boundaries | Calendar months versus fixed day count; timezone for rank windows and ID date | Three-month observations; RTR date is the first sync day |

## Remaining product details

| Area | Open detail |
|---|---|
| Licensing | Renewal effective dates (early renewal, overlapping terms), refund policy, offline entitlement mechanism, forgotten club password reset method |
| Closing a session | Final policy for games still in play (v1 blocks Session done while any match is Playing, until it is finished or invalidated); whether unplayed waiting matches are kept anywhere (they are dropped from results, and On court matches that never started are dropped the same way, settled November 6, 2026); when an invalid session releases the active-session slot |
| Mid-session settings | Whether mode, formats, or the minimum can change after start; they stay fixed until decided |
| Invalid-session recovery | Whether later recovery of the original device can reopen an already-invalid session; original records are mandatory in every case |
| Assessment timing | Whether an assessment saved for a roster player who never attends or whose session becomes invalid still contributes; immediate assessment updates were agreed, but rollback/removal rules were not |
| Guest linking implementation | Who confirms a historical guest identity, what evidence is required, and how mistaken/duplicate links are resolved; including earlier games after identity confirmation is settled below |
| Session standings | Three-or-more-way ties, conflicting head-to-head results, and identical names; do not replace the agreed wins/losses/head-to-head/name order |
| Awards | Final MVP, Most Improved, and Off Day math; the prototype formula is a reference only; five prior club sessions within three months and at least two counted games for MVP are fixed |
| Publication withdrawal | Whether published results can be fully unpublished; re-publishing with a new selection is allowed |
| Financials | Currencies other than pesos; automatic stock deduction; whether inventory edits work offline |
| ID allocation | Country/city code registry, grouping scope, concurrent sequence assignment, sequence beyond four digits |
| Profile editing | Exact personal fields and social visibility; whether operator edits of personal information continue after a profile is claimed |
| Expired-page behavior | Meaning/presentation of stale public pages; restoration after deletion; retention of internal club data beyond public pages |
| Admin configuration | Effect of changing weights/eligibility on existing ranks; which flags exist, targeting, and when offline devices pick up a flag change |

## Settled by the product owner on November 6, 2026

Recorded in the [mockup change log](../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md).

| Area | Decision |
|---|---|
| D1 · Generator name | The draft generator (five strategy tabs, drafts, transfer to Main Queue) is renamed **Generate matches** in all user-visible copy; behavior unchanged. Code names (`AutoQueueMode`, `AutoQueueCount`, `Q-AUTO`) stay until the real-app ticket |
| D2 · On court step | Lifecycle: Waiting → **On court** (placed on a court, not started) → **Playing** (after **Start match**) → Done / Invalid. On court allows switching sides and replacing players as plain lineup changes; Playing allows only **Substitute**. Buttons stay **Start match** / **Match done** |
| D3 · On court rules | On court players are busy ("Migs is on Court 1"). The timer starts at Start match. Start match is one tap with a presence/busy recheck ("Something changed. Review the match again."). A not-present player disables Start match until fixed or sent back. **Send back to queue** (to the top) and **Move to another court** (free open court; two for 5v5). Added the same day: **Swap with the queue** — the next ready match takes the court, and the On court match takes its queue place. Regenerate and Generate matches never change On court matches. Removing or editing a court is blocked while a match is on it. An edited match sent back is protected |
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
| T1 · One date-and-time picker | Every time field (session start/end, court planned start and end in setup and Add / Edit court, new end at Start session, live end) uses day buttons plus a list of times in 15-minute steps. Day buttons appear only when the field can fall on more than one day. Only valid times are listed; an existing off-grid value stays so it can be kept. No silent "next day" guessing |
| T2 · Changes after start | The end can be set to any time after now, later or earlier (up to 24 h after play began); **Extend 30 min** / **Extend 60 min** stay as shortcuts. Courts that follow the session end move with it. Court times keep their existing rules. The start time is fixed: "Start time is fixed: it records when play began." |
| T3 · Late or other-day start | Starting after the planned end, or on another calendar day than planned, needs a **New end** first, pre-filled with now + the planned length rounded up to 15 minutes; Start is disabled until it is after now |
| T4 · Every time shows its day | Today: "9:00 PM". Yesterday / tomorrow: "Yesterday 10:42 PM" (lower-case mid-sentence). Further: "Sat, Nov 1 · 9:00 PM". A range ending the next day: "7:00 PM–1:00 AM · next day". Plain times are fine next to a shown date |
| T5 · Overdue reminder | Live header shows "N left", then "Planned end passed N ago" (warning color, never color alone), with a console banner offering **Set end time** and **Session done**; the dashboard live card says the same. The session never closes by itself |
| T6 · Whose clock | Times are shown and entered in the club's time zone (Asia/Manila for v1), not the device's. Docs rule only; the prototype assumes device time is club time. The rank-window and ID-date timezone above stays open |
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
