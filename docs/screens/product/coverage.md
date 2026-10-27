# V1 screen coverage and acceptance checklist

**Status:** Specification coverage, not a claim that application behavior has been tested or implemented.

Every agreed business module has a corresponding screen contract. The checks below are acceptance examples for future implementation; pending policies are identified in [open decisions](open-decisions.md).

## Products, accounts, and commercial boundary

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Queue naming; four-product ecosystem; World deferred | [Product scope](README.md) | New copy says Queue; no World v1 screen |
| Dedicated club username/password, one operator authority | [Access/home](modules/queue/access-home.md) | No manager-role selector or player-account requirement for club login |
| Every session belongs to club; one active session | [Setup](modules/queue/session-setup.md) | Another active event prevents a second start; same-event recovery allowed |
| Monthly/yearly, yearly discount, manual payments/activation | [Admin licensing](modules/admin/clubs-licenses.md) | Operator sees real access state; Admin activates after external payment; no checkout |
| Fixed founding address, variable session venue | [Club detail](modules/admin/clubs-licenses.md), [setup](modules/queue/session-setup.md) | Changing venue does not alter player-ID founding location |
| Expired club loses saved-player/report access | [License gate](modules/queue/access-home.md) | No blocked data flashed or read-only grace period |
| Already-active session can finish/sync after expiry | [State matrix](state-matrix.md) | Narrow continuation works; unrelated history/new session unavailable |
| Stale public pages deleted after six continuous expired months | [Public session](modules/queue/public-session.md), [retention](modules/admin/clubs-licenses.md) | Correct stale/deleted state; renewal cancels/reset cycle; history preserved |

## Player entry and identities

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Operator adds and confirms all slots | [Roster](modules/queue/players-roster.md) | No public Request to join/Cancel attendance controls |
| Club remembers returning players and guests | [Saved players](modules/queue/players-roster.md) | Club list searched first; no formal membership workflow implied |
| Name lookup suggests global identity | [Identity confirmation](modules/queue/players-roster.md) | Name match does not auto-link two different people |
| Phone uniquely links across clubs | [Identity confirmation](modules/queue/players-roster.md) | Same phone resolves existing profile; conflict is explicit |
| No phone means guest; account not needed to play | [Add player](modules/queue/players-roster.md) | Slot can be confirmed without email/phone; no global ID invented |
| Incomplete profile enrichment or operator-issued registration link | [Roster](modules/queue/players-roster.md), [claim](modules/player-information/access-registration.md) | Missing socials do not block participation; no offline fake claim link |
| Offline late arrival allowed | [Roster](modules/queue/players-roster.md), [sync](modules/queue/offline-recovery.md) | Name/level/optional phone saved locally; link waits for connection |
| One of nine levels assigned; global rank only a suggestion | [Assessment selector](modules/queue/players-roster.md) | All nine levels; local Beginner allowed despite higher global label |
| Reassess only during roster preparation | [Assessment selector](modules/queue/players-roster.md) | No unrestricted reassess button on saved-player/profile view |
| Levels locked during session; late entrant assigned then locked | [Roster](modules/queue/players-roster.md) | Existing/late player levels cannot be edited while active |
| Present switch; no detailed resting statuses | [Roster](modules/queue/players-roster.md) | Automatic pool uses presence; switching off affects future matches, not active outcome |
| Hidden phones use ID/QR | [Player privacy](modules/player-information/identity-privacy.md), [identify](modules/queue/players-roster.md) | QR/search does not reveal phone or act as login |

## Pairing, courts, and matches

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Manual, Suggest, Auto Queue | [Queue](modules/queue/match-queue.md) | Each works without automatic court start |
| Chill/Fair/Hard are overridable session-wide presets | [Setup](modules/queue/session-setup.md), [generation](modules/queue/match-queue.md) | Flexible 30%/10% goals; Hard allows consecutive play; no individual-mode choice |
| Easy means favored team; balanced pairings matter | [Generation](modules/queue/match-queue.md) | No unsupported probabilities or guaranteed easy-game quota |
| Minimum-game priority; above-minimum indicator | [Pool](modules/queue/session-console.md) | Equal-to-minimum differs from above-minimum; QM can override lineup |
| Shared multi-round waiting queue, not per court | [Queue](modules/queue/match-queue.md) | One list feeds free courts; no court assignment merely by saving a lineup |
| Skip blocked first match to next eligible | [Dispatch](modules/queue/match-control.md) | Blocked match keeps its place; no double active participation |
| Automatic standard formats set before start | [Setup](modules/queue/session-setup.md) | Singles/doubles/both reflected in description and generator |
| Manual fun 1v2/3v3/4v4/5v5; 5v5 uses two courts | [Manual match](modules/queue/match-queue.md), [courts](modules/queue/session-console.md) | Fun formats never auto-generated; linked two-court occupancy released together |
| Fun games count local W/L/MVP/minimum, not global performance | [Results](modules/queue/results-sharing.md), [state matrix](state-matrix.md) | Local results can include fun; global eligibility excludes it |
| Needs attention, swap available, Regenerate | [Queue](modules/queue/match-queue.md) | Text/icon identifies affected lineup; accessible non-pulse alternative |
| Regenerate preserves active and healthy manual matches | [Regeneration](modules/queue/match-queue.md) | Flagged manual rebuilt; edited auto becomes protected |
| Pre-start and mid-game substitutions | [Match control](modules/queue/match-control.md) | Pre-start full player eligible; incoming/outgoing partials get no minimum/global credit |
| Winner-only or optional final scores | [Completion](modules/queue/match-control.md) | Winner-only succeeds; absent scores never become 0–0 |
| Confirmation, permanent winner/score | [Dialogs](dialogs.md) | No undo/edit/add-score-later in Queue or Admin |
| Invalid match irreversible, frees courts, counts nothing | [Invalid game](modules/queue/match-control.md) | Cancel keeps game active; confirmation frees courts and records no counted game |
| Add players/courts and extend session | [Live adjustments](modules/queue/session-console.md) | Updated locally/synced distinctly; no invented fee adjustment |

## Offline continuity and session closure

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Create online and download before offline operation | [Preparation](modules/queue/session-setup.md) | Failed/partial download not labeled Ready |
| Automatic resync, durable offline changes | [Sync](modules/queue/offline-recovery.md) | Local save distinct from acceptance; retry does not duplicate outcomes |
| Device 2 continues while device 1 is missing | [Device continuation](modules/queue/offline-recovery.md) | Continued play permitted; finalization remains blocked |
| Missing records prompt interruption question | [Recovery](modules/queue/offline-recovery.md), [dialogs](dialogs.md) | Yes requires original device; No cannot ignore inconsistency |
| No reconstructing permanently lost originals | [Unrecoverable](modules/queue/offline-recovery.md) | No Queue/Admin remembered-score form or override |
| Integrity failure is not ordinary unmet minimum | [Finalization](modules/queue/session-finalization.md) | Shortfall warning alone permits closing complete records |
| Session done online only | [Finalization](modules/queue/session-finalization.md) | No offline final slides or hidden server-sync bypass |
| Valid finalization updates profiles/rank automatically | [Progress](modules/queue/session-finalization.md) | Publishing not required; processing failure not falsely Invalid |
| Invalid session remains invalid and has no official records or leaderboard | [Invalid session](modules/queue/session-finalization.md) | No slide, publication, or global performance contribution, even if an original device later reconnects |

## Result culture and public access

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Slide 1 session standings W/L/games | [Results](modules/queue/results-sharing.md) | Wins, losses, head-to-head, name order; full roster exported legibly |
| MVP relative performance, guests qualify | [Awards](modules/queue/results-sharing.md) | Not simply most wins; no account requirement |
| Most Improved/Off Day need five prior club sessions in three months | [Awards](modules/queue/results-sharing.md) | Current session excluded; guests with saved history eligible; empty permitted |
| Off Day private until explicit sharing | [Publish/export](modules/queue/results-sharing.md) | Unselected slide absent from public payload/images/thumbnails |
| QM chooses publication | [Publish](modules/queue/results-sharing.md) | Global rank may update while club slideshow stays private |
| Story/feed image downloads; club logo/name; powered by rotra | [Export](modules/queue/results-sharing.md) | Exact branding, selected frames, no automatic social posting |
| Public session anyone with link | [Public page](modules/queue/public-session.md) | No login requirement; no Match/Chat or slot-self-service tabs |
| Public Details/Participants and stale sync state | [Public page](modules/queue/public-session.md) | Correct last-update copy, safe participant fields, no invented live status |

## Added from the ROTRA Queue prototype (October 26, 2026)

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Optional session cost estimate; fees collected outside ROTRA | [Financials](modules/queue/financials-inventory.md) | Every field optional; entrance fee is a misc cost in the total; payment per player is break-even (rounds up) or custom with profit/loss; never public |
| Paid / not-paid checklist | [Payments](modules/queue/financials-inventory.md) | Amount due is the full payment per head, never the entrance fee alone; works offline; no money moves |
| Slot budget, first come first served | [Setup](modules/queue/session-setup.md), [roster](modules/queue/players-roster.md) | Courts × players per court; extra players waitlisted; reducing the budget moves the latest-added to the front of the waitlist in order |
| Club name change needs approval | [Club settings](modules/queue/access-home.md), [Admin club detail](modules/admin/clubs-licenses.md) | Old name shown until approved; one pending request; cancellable |
| Club password change | [Club settings](modules/queue/access-home.md) | Requires the correct current password; forgotten passwords reset by the platform owner |
| Club settings online only | [Club settings](modules/queue/access-home.md) | Offline shows only the connection message |
| Registered players need no identity check | [Add player](modules/queue/players-roster.md) | Only unclaimed profiles require RTR ID / QR / phone confirmation |
| Light and dark themes | [Top bar](modules/queue/access-home.md) | Dark default; switch remembered per device |
| Guest join requests from the session link | [Public join](modules/queue/public-session.md), [preparation](modules/queue/session-setup.md), [console](modules/queue/session-console.md) | A request holds no slot; QM confirms with a level or declines; full sessions confirm to the waitlist in request order; requests can be turned off |
| Live vs upcoming is unmistakable on the dashboard | [Home](modules/queue/access-home.md) | LIVE NOW filled badge with live numbers, or UPCOMING outlined badge with a countdown |
| Slots left before the waitlist | [Preparation](modules/queue/session-setup.md) | “14/24 slots · 10 left before the waitlist”; amber at 2 or fewer; full and over-budget states |
| Level vs suggestion prompt | [Preparation](modules/queue/session-setup.md) | May be too high / may be too low / matches, by step count; prompt only |
| Saved players “Right now” filter | [Saved players](modules/queue/players-roster.md) | Playing now / at the session / in the live session; disabled when nothing is live |
| Adding several players in a row | [Add player](modules/queue/players-roster.md) | Dialog stays open; already-added players are not listed; registered players add in one tap; unclaimed open Confirm player |
| Sign out is confirmed | [Dialogs](dialogs.md) | Warns about unsynced changes, a live session, and being offline |
| Usable on phones | [Experience contract](experience-contract.md) | No sideways scrolling at 375 px; tabs and action rows fit; tables become labelled cards |
| Touch-sized controls | [Experience contract](experience-contract.md) | On touch screens or at 1024 px and narrower: buttons 44–48 px, icon buttons 44 × 44 px, bigger switches and queue-card pictures |
| Club inventory with manual stock | [Inventory](modules/queue/financials-inventory.md) | Running low at 2 or fewer; stock not auto-deducted; license-gated |
| Three-page setup (only page 1 required) with calculated minimum | [Setup](modules/queue/session-setup.md) | Minimum equals the low estimate until overridden; updates with roster before start |
| Dashboard calendar by screen size | [Home](modules/queue/access-home.md) | Month on desktop, week on tablet, day on phone; sessions colored by state open the right screen |
| App-wide left nav and phone dock | [Home](modules/queue/access-home.md), [Navigation](navigation.md) | Burger collapses to an icon rail; under 900 px a dock with Menu, one main session action, and Settings; no duplicate floating buttons |
| Club settings menu on phones | [Club settings](modules/queue/access-home.md) | One button opens the menu as a left drawer; opening it closes the main menu; Esc, scrim, or a pick closes it |
| Courts close at set times; free courts removable | [Add court](modules/queue/session-console.md) | Closing time is a reminder; occupied/last court cannot be removed |
| Make match from selected players | [Players view](modules/queue/session-console.md) | Count picks format; disabled standard formats refused; added to queue end as protected |
| Queue order is a suggestion | [Queue](modules/queue/match-queue.md), [pick another](modules/queue/match-control.md) | Any ready match starts on any free court; blocked matches keep their place |
| Unedited suggestions stay unprotected | [Suggest](modules/queue/match-queue.md) | Regenerate rebuilds them; edited ones are kept |
| Drag players to switch sides | [Queue](modules/queue/match-queue.md), [Start match](modules/queue/match-control.md) | Queue cards, Suggest, Edit lineup, Start match; touch press-and-hold; ← / → on keyboard; protects the match; not during play |
| Live leaderboard | [Leaderboard](modules/queue/session-console.md) | Same order as slide 1; partial/invalid excluded |
| Session done blocked by games in play | [Finalization](modules/queue/session-finalization.md) | Continue disabled until every game is finished or invalidated |
| Re-publication with Off Day reset | [Publish](modules/queue/results-sharing.md) | Off Day unchecked on every open |
| Paginated exports | [Export](modules/queue/results-sharing.md) | 14 rows per Story, 10 per Feed image |
| Read-only session record | [History](modules/queue/results-sharing.md) | Matches by court in order; invalid sessions show no matches |

## Player Information and Admin

| Requirement | Screen contract | Acceptance evidence to obtain later |
|---|---|---|
| Public profiles and global leaderboard | [Profile](modules/player-information/profile.md), [ranking](modules/player-information/ranking-history.md) | No city/club filter or stage-category expansion |
| Required phone/email; phone-or-email + password | [Registration/access](modules/player-information/access-registration.md) | No social login; claim tied to existing identity |
| Optional preset socials/experience/style | [Registration/profile](modules/player-information/access-registration.md) | Optional fields not revived old mandatory onboarding |
| Forgot password sends email | [Recovery](modules/player-information/access-registration.md) | Operator not routine password-reset authority |
| Player edits personal info, never games | [Own profile](modules/player-information/profile.md) | Contacts read-only; rank/history non-editable |
| Phone/email changes manually approved by owner | [Request](modules/player-information/identity-privacy.md), [Admin review](modules/admin/players-requests.md) | Request/approval/application distinguished; collisions do not merge players |
| Permanent RTR format, sync day, founding city, per-day sequence | [ID/QR](modules/player-information/identity-privacy.md) | No offline fake ID; no residence claim or ID change after contacts move |
| 70/30, equal latest per club, last three months | [Rank explanation](modules/player-information/ranking-history.md) | Current configured weights shown; no duplicate club votes or fake formula |
| Needs reassessment preserves old rank | [Eligibility](modules/player-information/ranking-history.md) | Hidden global position until fresh session and recent-count gate met |
| Ten recent full standard matches, adjustable | [Leaderboard](modules/player-information/ranking-history.md), [config](modules/admin/configuration.md) | Rolling not lifetime; fun/partial/invalid excluded; threshold reflects configuration |
| Admin flags and settings | [Configuration](modules/admin/configuration.md) | Actual flags only; no invented bypasses or unapproved controls |
| Retained history after public page deletion | [History](modules/player-information/ranking-history.md) | Unavailable page link does not erase official player records |

## Completeness boundary

The inventory includes **83 surfaces in 19 detailed module files**, shared states, navigation, and confirmation dialogs. It includes user-visible error/empty/loading/offline/denied states and cross-product consequences.

Completeness here means every agreed workflow has a documented screen contract. It does not mean unresolved formulas, provider configuration, verification policy, or conflict adjudication have been silently decided. Those remain explicit implementation gates.
