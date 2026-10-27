# Open decisions before implementation

**Status:** Deliberately unresolved. These are not additional approved requirements and are not a new questionnaire. Updated October 26, 2026: items the [ROTRA Queue prototype](../../frames/queue-app/rotra-queue.html) settled are listed under [Settled by the prototype](#settled-by-the-prototype). Updated October 27, 2026: items the platform owner settled with the [ROTRA Admin prototype](../../frames/admin-app/rotra-admin.html) are listed under [Settled by the Admin prototype](#settled-by-the-admin-prototype).

The product direction is sufficiently defined for documentation. Resolve the relevant items during focused design of each module, rather than reopening the whole business interview. Existing code or old docs must not silently supply answers where they conflict with v1.

## Implementation blockers

| Area | What remains unresolved | What is already fixed |
|---|---|---|
| Numerical ranking | Skill-label mapping; normalization of the two components; performance calculation; score influence; handling sparse/absent recent data; global ties | 70% equally weighted latest club assessments, 30% performance; last three months; operator-assigned local levels are authoritative |
| Queue generation | Final team-strength/probability model; meaning of level-matched/easy in numbers; mode and fairness weights; default number of matches per Auto queue run | Shared queue, operator starts, minimum-game priority, flexible Chill/Fair targets, manual overrides; operator picks 2/3/4/6 per run; the prototype heuristic is the reference |
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
| Closing a session | Final policy for games still in play (v1 blocks Session done until they are finished or invalidated); whether unplayed waiting matches are kept anywhere (they are dropped from results); when an invalid session releases the active-session slot |
| Mid-session settings | Whether mode, formats, or the minimum can change after start; they stay fixed until decided |
| Invalid-session recovery | Whether later recovery of the original device can reopen an already-invalid session; original records are mandatory in every case |
| Assessment timing | Whether an assessment saved for a roster player who never attends or whose session becomes invalid still contributes; immediate assessment updates were agreed, but rollback/removal rules were not |
| Profile sync timing | Whether a new phone-linked profile/ID is created during an intermediate sync or only on valid Session done; long-term match performance remains gated by valid finalization |
| Guest linking | Whether prior name-only guest sessions backfill into a profile when linked; effect on recent rank and eligibility |
| Session standings | Three-or-more-way ties, conflicting head-to-head results, and identical names; do not replace the agreed wins/losses/head-to-head/name order |
| Awards | Final MVP, Most Improved, and Off Day math; the prototype formula is a reference only; five prior club sessions within three months and at least two counted games for MVP are fixed |
| Publication withdrawal | Whether published results can be fully unpublished; re-publishing with a new selection is allowed |
| Financials | Currencies other than pesos; automatic stock deduction; whether inventory edits work offline |
| ID allocation | Country/city code registry, grouping scope, concurrent sequence assignment, sequence beyond four digits |
| Profile editing | Exact personal fields and social visibility; whether operator edits of personal information continue after a profile is claimed |
| Expired-page behavior | Meaning/presentation of stale public pages; restoration after deletion; retention of internal club data beyond public pages |
| Admin configuration | Effect of changing weights/eligibility on existing ranks; which flags exist, targeting, and when offline devices pick up a flag change |

## Settled by the prototype

These were open or unspecified before October 26, 2026.

| Area | Decision |
|---|---|
| Fun-format courts | 1v2, 3v3, and 4v4 use one court; 5v5 uses two courts shown as one merged area |
| Partial participation | Substituted-out and substituted-in players get no win, loss, game, or award credit from that match anywhere |
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

Decided by the platform owner on October 27, 2026, while reviewing the [ROTRA Admin prototype](../../frames/admin-app/rotra-admin.html).

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
