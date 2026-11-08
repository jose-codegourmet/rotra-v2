# Screen decisions still requiring a focused specification

> **November 8, 2026:** The owner decisions in [Offline operation and recovery](../../business_logic/product/queue/modules/offline/README.md) supersede conflicting earlier offline, device, finalization, payment and conflict rules below. Late-record recovery and implementation details remain open.


**Last verified:** 2026-11-07 for player login mapping and claim-link rules (#244) and the MVP offline-start note (D-2026-11-07-03); 2026-11-06 for the On court step, court filling, substitution game credit, and the connection rules for Cancel session and the court switch; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Explicit unresolved details, not omitted screens and not a new interview questionnaire. Updated October 26, 2026: items settled by the [ROTRA Queue prototype](../../../apps/mockup/queue-app/rotra-queue.html) are listed at the end, followed by those settled with the [ROTRA Admin prototype](../../../apps/mockup/admin-app/rotra-admin.html) on October 27, 2026.

The screen tree specifies all agreed v1 workflows. Where behavior is undecided, the relevant screen includes its exact boundary and safe pending/error presentation. Do not fill these gaps from old code, placeholder data, or an invented default.

## Business decisions inherited from the source documents

| Decision | Affected screens | Current safe boundary |
|---|---|---|
| Club password recovery | Q-LOGIN, Q-CLUB, A-CLUB-DETAIL | No fabricated manager or password-export flow. The club can change its own password with the current one; forgotten-password reset stays with the platform owner, but how is not specified, so Admin shows no reset control yet. (The club edits its logo and requests name changes.) |
| License stacking/effective dates and refunds | Q-ACCESS, A-LICENSE | A renewal is proposed to start the day after the current term ends; overlaps show a warning. No refund flow |
| Offline start authorization and device enrollment | Q-DOWNLOAD, Q-START, Q-DEVICE-CONTINUE | A downloaded screen is not automatically proof of write/start authorization (MVP: offline start is out of MVP under [D-2026-11-07-03](../../mvp/decisions.md#d-2026-11-07-03), so start authorization is moot for MVP; device enrollment for continuation stays open) |
| Conflicting permanent outcomes | Q-CONFLICT | No last-write-wins or generic winner edit |
| Final policy for games still in play / unused waiting queue | Q-SESSION-DONE | V1 blocks Session done while any match is Playing, until it is finished or invalidated; unplayed waiting matches and On court matches never started are dropped from results (the latter settled November 6, 2026); never manufacture winners or silently invalidate |
| Releasing the active-session slot after invalidation | Q-INVALID-SESSION | Invalidity is permanent, as explicitly agreed; slot-release mechanics still need definition |
| Historical guest identity confirmation and link conflicts | Q-ADD-PLAYER, P-ID-QR, P-MATCH-HISTORY | Profile/ID creation on successful entry sync and inclusion of earlier guest games after identity confirmation are settled below. No name-only transfer or invented offline permanent ID; confirmation evidence and conflict resolution remain open |
| Post-claim operator edits and contact verification | Q-ADD-PLAYER, P-CLAIM, A-PLAYER-DETAIL | No unrestricted personal/contact overwrite |
| Claim email verification, password policy, loss of contacts | P-CLAIM, P-CLAIM-STATUS, P-FORGOT, P-RESET, P-CONTACT-REQUEST | Defined flow boundaries, no invented SMS/social-login/evidence requirement. Link lifetime is settled below (November 7, 2026) |
| Final rank/pairing/award formulas and window boundary | Q-SUGGEST, Q-AUTO, Q-AWARDS-SLIDE, P-RANK-DETAIL | The prototype heuristic and award formula are references; no win probabilities shown to operators |
| Three-or-more-way head-to-head and identical-name ties | Q-STANDINGS-SLIDE, Q-LEADERBOARD | Preserve wins/losses/head-to-head/name order; no substitute strength tiebreak |
| Public history/social visibility | P-PUBLIC-PROFILE, P-MATCH-HISTORY | Expose only approved fields; no contact/private-Off-Day leak |
| Stale-page access and post-deletion restoration | Q-PUBLIC-STALE, A-RETENTION | Distinguish stale/deleted; no unsupported restoration promise |
| Settings effective-time, flag targeting and offline flag effects | A-RANK-CONFIG, A-FEATURE-FLAGS | No false instant rerank or remote update guarantee; flags are platform-wide on/off |

## Composition/interaction details proposed but not yet fixed

- Exact routes beyond the approved mock auth boundary (`/login` in all apps, public Queue `/s/[slug]`, public Player `/players/[playerId]`, protected Player `/me`; approved October 27, 2026), component names, page-versus-sheet boundaries, field-length limits, design tokens, and export pixel dimensions.
- Changing mode/formats/minimum during an active session. They stay visible and fixed until decided.
- The Generate matches (formerly called Auto Queue) match count is explicitly selected from 2, 3, 4 or 6, with no preselected default (owner decision October 31, 2026).
- Fully withdrawing a publication (re-publishing a new selection is settled).
- Access to five-session history for award calculations when a returning guest was duplicated rather than recognized.
- Whether individual club assessments are itemized publicly. Equal-weight aggregation is agreed; public assessment disclosure is not.
- Read-only historical/cache behavior on disconnected devices and preserving unsynced work on sign-out.
- Whether inventory edits work offline; currencies other than pesos.
- Showing player contact details (Facebook, phone, email) next to payments. The paid / not-paid checklist itself is settled; contacts stay private.
- New Admin auth policy: email/password is a proposed carry-forward from the existing specification, not a newly confirmed product decision.
- Copy the November 6, 2026 decision did not give, to be taken from the mockup when it lands: the Q-CHOOSE-MATCH sheet title (was “Start a match on Court X”); the Confirm substitution warning when a person gets the game; the 5v5 Playing chip wording (was **Merged · in game**); the Manual Queue helper copy, if any; and any toast after **Put on court**, **Send back to queue** or **Move to another court**.
- Two offline devices placing the same match or court by hand with **Put on court** (collision-free assignment stays open). The Manual Queue | Auto Queue switch offline is settled below.
- The offline notice copy for Cancel session and the Manual Queue | Auto Queue switch (both need internet, settled below), to be taken from the mockup. Also settled November 6, 2026: the Preparation header keeps **both** Delete session (nobody confirmed) and Cancel session (players joined); the prototype now shows both ([log](../../mockup-changes/2026-11-06-queue-delete-session.md)).
- What Q-POOL shows for a player in a Getting ready match (the status list has **On Court X**, **Away**, **Queued · #P**, **Free**).

## Settled by the product owner on November 7, 2026

Recorded in the [business decision summary](../../business_logic/product/open-decisions.md#settled-by-the-product-owner-on-november-7-2026) (#244). Club username and platform-owner sign-in are unchanged.

| Area | Decision | Screens |
|---|---|---|
| Player sign-in mapping | Account keyed by email + password; players sign in with email only (phone login withdrawn 2026-11-08). No SMS | P-LOGIN |
| Credential failure | One generic error; never reveals whether an email exists | P-LOGIN |
| Recovery | Email-only; email is required for every account | P-FORGOT, P-RESET |
| Claim links | Valid 7 days, single use; the club reissues, which invalidates the previous link; expired/used links show the existing state | P-CLAIM-STATUS |
| Contact collision at claim | Block and show the contact-support route; never merge. An RTR ID or name alone never claims | P-CLAIM, P-CLAIM-STATUS |

## Settled by the product owner on November 6, 2026

Recorded in the [mockup change log](../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md) and the [business decision summary](../../business_logic/product/open-decisions.md#settled-by-the-product-owner-on-november-6-2026).

| Area | Decision | Screens |
|---|---|---|
| Generator name | Shown as **Generate matches** everywhere; formerly called Auto Queue. `Q-AUTO` keeps its ID | Q-QUEUE, Q-AUTO, Q-SETUP |
| On court step | **Put on court** places a match (chip **Getting ready**); **Start match** starts it in one tap (chip **Playing**). The timer starts at Start match | Q-DISPATCH, Q-ON-COURT, Q-COURTS |
| On court actions | Switch sides, **Replace player** (lineup change, not a substitution), **Move to another court**, **Send back to queue** (to the top), **Swap with the queue** (decided November 6, 2026), **Start match** with a recheck | Q-ON-COURT |
| Court filling | **Manual Queue \| Auto Queue** switch on the Courts section, Manual by default. Auto places, never starts: “Free courts get the next ready match. You still start each one.” | Q-COURTS |
| Court card look | Free: plain, chip **Free** / Not open yet. Getting ready: normal border. Playing: steady accent glow, no pulse, chip **Playing**. Always with a text label; tokens only | Q-COURTS |
| Substitution game credit | Step **Who gets this game?**: Nobody (default) · NAME (coming in) · NAME (going off); “Started M min ago”; session credit only, never long-term performance; record line “Kiko replaced Jom · Kiko got the game (QM choice)” | Q-SUBSTITUTE, Q-ACTIVE-MATCH, Q-MATCH-RECORD, Q-LEADERBOARD |
| Session done | Blocked only by Playing matches; “N matches on court weren't started and will be dropped.” | Q-SESSION-DONE |
| Cancelled sessions | **Cancel session** on Preparation (prepared only) → D-CANCEL-SESSION (optional reason, paid warning, “This can't be undone.”) → read-only cancelled record; calendar hollow dot and struck-through title; public page “This session is cancelled. REASON.” with no join card. [Change log](../../mockup-changes/2026-11-06-queue-example-sessions-and-cancel.md) | Q-PREPARE, Q-HOME, Q-HISTORY, Q-PUBLIC-JOIN |
| Cancel session connection | **Needs internet**, like Delete session. Never queued offline and never replayed by sync (Jose, November 6, 2026) | Q-PREPARE, D-CANCEL-SESSION |
| Court switch offline | The **Manual Queue \| Auto Queue** switch **needs internet**. While the device is offline, auto filling pauses (no automatic placements), so two offline devices can't collide through it; manual **Put on court** keeps today's offline behaviour (Jose, November 6, 2026) | Q-COURTS |
| Short on players | Live banner “7 players present: enough for 1 doubles court. 3 sit out each game.”; free court “Not enough free players.” | Q-CONSOLE, Q-COURTS |
| Times and days (T1–T6) | Every time shows its day; one date-and-time picker (day buttons + valid times in 15-minute steps); live **Set end time** with Extend 30/60 as shortcuts; start time fixed; late or other-day start needs a **New end**; overdue reminder “Planned end passed N ago”; club time zone (docs only). [Change log](../../mockup-changes/2026-11-06-queue-time-and-day.md) | Q-SETUP, Q-START, Q-CONSOLE, Q-SESSION-ADJUST, Q-ADD-COURT, Q-COURTS, Q-HOME |

## Settled by the product owner (October 28, 2026)

| Area | Decision | Screens |
|---|---|---|
| Profile and RTR ID availability | Show the real profile/ID after successful entry sync; do not wait for Session done. Lookup pending remains truthful until matching/allocation succeeds | Q-ADD-PLAYER, P-ID-QR |
| Earlier guest games | After identity confirmation, include earlier valid games in personal history and ranking under existing eligibility/window rules. Keep counts accurate during processing and never transfer by name alone | P-MATCH-HISTORY, P-RANK-DETAIL, P-ELIGIBILITY |

## Settled by the prototype (October 26, 2026)

| Former open item | Decision | Screens |
|---|---|---|
| Non-5v5 fun court allocation | One court; 5v5 two | Q-MANUAL, Q-DISPATCH |
| Partial-player local W/L/MVP | No credit for either partial player anywhere. Amended November 6, 2026: unless the Queue Master gives one of them the game (session credit only) | Q-MATCH-RECORD, Q-STANDINGS-SLIDE, Q-LEADERBOARD |
| Manual-only sessions | Allowed with both standard formats off, with a warning | Q-SETUP |
| Disabled standard formats in manual queueing | Not offered | Q-MANUAL, Q-POOL |
| Accepted unedited suggestion | Not protected | Q-SUGGEST |
| Removing a confirmed roster slot | During preparation only | Q-PREPARE |
| Public minimum target, presence, levels | Minimum shown; presence and levels not shown | Q-PUBLIC-DETAILS, Q-PUBLIC-PARTICIPANTS |
| Re-publication and Off Day consent | Re-publish allowed; Off Day unchecked every time | Q-PUBLISH, Q-EXPORT |
| Public result layout | Results section below the tabs on the same page | Q-PUBLIC-RESULTS |
| Shuttle pricing and cost panels | Optional estimate in setup; inventory screen | Q-FINANCIALS, Q-INVENTORY |
| Branding ownership | Logo: edited by the club. Name: club requests, platform owner approves in Admin | Q-CLUB, A-CLUB-DETAIL |
| Payment per player vs entrance fee | Payment is the full amount (break-even or custom); entrance fee is a misc cost line | Q-FINANCIALS, Q-PAYMENTS |
| Reducing the slot budget | Latest-added players move to the front of the waitlist on save | Q-SETUP, Q-PREPARE |
| Identity confirmation | Unclaimed profiles only | Q-ADD-PLAYER, Q-IDENTIFY |
| Queue reordering controls | Drag handle (arrow keys on the handle); no Earlier / Later buttons | Q-QUEUE |
| Switching players between teams | Drag a player onto the other team (press and hold on touch; ← / → on keyboard); swaps, protects the waiting match. Since November 6, 2026 also allowed while On court, until Start match | Q-QUEUE, Q-SUGGEST, Q-MANUAL, Q-DISPATCH, Q-ON-COURT |
| Theme | Dark default with a light/dark switch in the top bar | All Queue screens |
| Level selector | Nine levels grouped Beginner / Intermediate / Advanced | Q-ASSESS, Q-ADD-PLAYER, Q-PREPARE |
| Setup flow | Three pages with Create session available from page 1 | Q-SETUP |
| Guest join requests | Request to join on the public page; QM confirms or declines in preparation or the console | Q-PUBLIC-JOIN, Q-PREPARE, Q-CONSOLE |

## Settled by the Admin prototype (October 27, 2026)

| Former open item | Decision | Screens |
|---|---|---|
| Club account provisioning | The platform owner adds clubs directly; no application flow | A-CLUBS, A-ADD-CLUB |
| License prices and discount | Each club has its own monthly and yearly price (yearly below twelve months), or is free as a tester; the license amount is prefilled from it | A-ADD-CLUB, A-CLUB-PRICE, A-LICENSE |
| Feature flag catalog | Starts empty; the platform owner adds flags with a name, a fixed key, a description and a starting value | A-FEATURE-FLAGS, A-ADD-FLAG |
| Club detail layout | Tabs: Overview, License, Public pages, Activity | A-CLUB-DETAIL |

## Sources

[Business open decisions](../../business_logic/product/open-decisions.md) and [database design decisions](../../database_design/product/open-decisions.md).

No unresolved item grants permission to edit permanent game outcomes, reconstruct lost originals, let anyone self-admit into a session slot (guests may only send a join request the Queue Master confirms), force Facebook login, collect payments in-app, or introduce World v1.

## Settled by the product owner (October 31, 2026)

See [Queue flexibility owner review](../../decisions/2026-10-30-queue-flexibility/05-owner-review.md) for capacity, court windows, Auto Queue (now Generate matches) strategy and transfer decisions. The reviewed choices do not settle pairing weights or unrelated open items.
