# Screen decisions still requiring a focused specification

**Status:** Explicit unresolved details, not omitted screens and not a new interview questionnaire. Updated October 26, 2026: items settled by the [ROTRA Queue prototype](../../frames/queue-app/rotra-queue.html) are listed at the end, followed by those settled with the [ROTRA Admin prototype](../../frames/admin-app/rotra-admin.html) on October 27, 2026.

The screen tree specifies all agreed v1 workflows. Where behavior is undecided, the relevant screen includes its exact boundary and safe pending/error presentation. Do not fill these gaps from old code, placeholder data, or an invented default.

## Business decisions inherited from the source documents

| Decision | Affected screens | Current safe boundary |
|---|---|---|
| Club password recovery | Q-LOGIN, Q-CLUB, A-CLUB-DETAIL | No fabricated manager or password-export flow. The club can change its own password with the current one; forgotten-password reset stays with the platform owner, but how is not specified, so Admin shows no reset control yet. (The club edits its logo and requests name changes.) |
| License stacking/effective dates and refunds | Q-ACCESS, A-LICENSE | A renewal is proposed to start the day after the current term ends; overlaps show a warning. No refund flow |
| Offline start authorization and device enrollment | Q-DOWNLOAD, Q-START, Q-DEVICE-CONTINUE | A downloaded screen is not automatically proof of write/start authorization |
| Conflicting permanent outcomes | Q-CONFLICT | No last-write-wins or generic winner edit |
| Final policy for games still in play / unused waiting queue | Q-SESSION-DONE | V1 blocks Session done until games are finished or invalidated; unplayed waiting matches are dropped from results; never manufacture winners or silently invalidate |
| Releasing the active-session slot after invalidation | Q-INVALID-SESSION | Invalidity is permanent, as explicitly agreed; slot-release mechanics still need definition |
| New-profile allocation moment and guest-history backfill | Q-ADD-PLAYER, P-ID-QR, P-MATCH-HISTORY | Pending identity shown honestly (Lookup pending); no invented permanent ID or automatic old-history transfer |
| Post-claim operator edits and contact verification | Q-ADD-PLAYER, P-CLAIM, A-PLAYER-DETAIL | No unrestricted personal/contact overwrite |
| Claim/reset verification, link lifetime, loss of contacts | P-CLAIM-STATUS, P-FORGOT, P-RESET, P-CONTACT-REQUEST | Defined flow boundaries, no invented SMS/social-login/evidence requirement |
| Final rank/pairing/award formulas and window boundary | Q-SUGGEST, Q-AUTO, Q-AWARDS-SLIDE, P-RANK-DETAIL | The prototype heuristic and award formula are references; no win probabilities shown to operators |
| Three-or-more-way head-to-head and identical-name ties | Q-STANDINGS-SLIDE, Q-LEADERBOARD | Preserve wins/losses/head-to-head/name order; no substitute strength tiebreak |
| Public history/social visibility | P-PUBLIC-PROFILE, P-MATCH-HISTORY | Expose only approved fields; no contact/private-Off-Day leak |
| Stale-page access and post-deletion restoration | Q-PUBLIC-STALE, A-RETENTION | Distinguish stale/deleted; no unsupported restoration promise |
| Settings effective-time, flag targeting and offline flag effects | A-RANK-CONFIG, A-FEATURE-FLAGS | No false instant rerank or remote update guarantee; flags are platform-wide on/off |

## Composition/interaction details proposed but not yet fixed

- Exact routes, component names, page-versus-sheet boundaries, field-length limits, design tokens, and export pixel dimensions.
- Changing mode/formats/minimum during an active session. They stay visible and fixed until decided.
- Default number of matches per Auto queue run (the operator picks 2, 3, 4, or 6; the prototype preselects 3).
- Fully withdrawing a publication (re-publishing a new selection is settled).
- Access to five-session history for award calculations when a returning guest was duplicated rather than recognized.
- Whether individual club assessments are itemized publicly. Equal-weight aggregation is agreed; public assessment disclosure is not.
- Read-only historical/cache behavior on disconnected devices and preserving unsynced work on sign-out.
- Whether inventory edits work offline; currencies other than pesos.
- Showing player contact details (Facebook, phone, email) next to payments. The paid / not-paid checklist itself is settled; contacts stay private.
- New Admin auth policy: email/password is a proposed carry-forward from the existing specification, not a newly confirmed product decision.

## Settled by the prototype (October 26, 2026)

| Former open item | Decision | Screens |
|---|---|---|
| Non-5v5 fun court allocation | One court; 5v5 two | Q-MANUAL, Q-DISPATCH |
| Partial-player local W/L/MVP | No credit for either partial player anywhere | Q-MATCH-RECORD, Q-STANDINGS-SLIDE, Q-LEADERBOARD |
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
| Switching players between teams | Drag a player onto the other team (press and hold on touch; ← / → on keyboard); swaps, protects the waiting match | Q-QUEUE, Q-SUGGEST, Q-MANUAL, Q-DISPATCH |
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
