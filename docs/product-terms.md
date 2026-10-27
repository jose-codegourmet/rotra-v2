# Product terms — ROTRA v1

**Last verified:** 2026-10-27 · **Owner:** product owner · **Single source of vocabulary.** If a word here
disagrees with a business, screen, or database doc, this file is wrong and must be fixed in the same PR.

**Read this when** a task uses a domain word, or names a type, component, route, query key, enum value,
or piece of UI copy. Rules behind each term live in the business docs linked per section.

---

## 1. Spelling and naming rules

| Rule | Right | Wrong |
|---|---|---|
| Product name is all caps in UI copy | ROTRA | Rotra, rotra |
| The one lowercase exception: the result-slide footer, exactly | powered by rotra | Powered by ROTRA |
| Queue, never the legacy "Que" (code, copy, docs) | Queue, Queue Session, Queue Master | Que, Que Session, Que Master |
| The player app's product name | Player Information | Players app, Profile app |
| Match done and Session done are different actions | Match done · Session done | Finish, Complete, End (ambiguous) |
| An invalid game is "invalid", never "void" or "unscored" | Invalid match | Voided, Unscored, Cancelled |

The prototypes call the Player Information app "ROTRA Players"; that is a prototype title, not the product name.

---

## 2. Products, apps, and people

| Term | Meaning | In code |
|---|---|---|
| Queue | Club-operated session app; main v1 product | `apps/queue` |
| Player Information | Public profiles, shared rank, overall leaderboard; personal profile editing | `apps/player` |
| Admin | Platform owner's tools: clubs, licenses, players, settings, flags | `apps/admin` |
| World | Nearby-club discovery. **v2 — do not build anything for it** | — |
| Club | The organisation that runs sessions; has a fixed founding location | `Club` |
| Club account | The club's single username + password. One account = one operating authority | `ClubAccount` |
| Queue Master / QM / club operator | Whoever is signed in to the club account. Owner, manager, and QM are the same authority in v1 | — (not a role enum) |
| Platform owner | The person running ROTRA; the only Admin user | `AdminAccount` |
| Public viewer | Anyone with a link; no sign-in | — |
| Registered player | Player who claimed a profile (phone + email + password) | `PlayerAccount` |

There is **no role switcher, manager invite, or per-person attribution** in v1. Actions are attributed to the
club account and device, not a human.

---

## 3. Sessions and capacity

Rules: [Sessions](business_logic/product/queue/modules/sessions/README.md) ·
[Players](business_logic/product/queue/modules/players/README.md)

| Term | Meaning |
|---|---|
| Queue Session | A whole club event, e.g. 8–11 PM. One club has at most one active session |
| Session states | **Prepared** (set up, not started) → **Active** (running) → **Finalized** (validly finished) or **Invalid** (untrusted records). DB proposal adds a transient `finalizing` and names finalized `completed` |
| Slot | An operator-confirmed place in a session |
| Slot budget | Players per court (club default 8) × courts = number of slots |
| Waitlist | First-come list of players added after slots filled; the operator gives them slots |
| Session link | The session's public page URL. Guests can send a join request from it |
| Join request | A guest's request for a slot. Holds nothing until the QM confirms or declines |
| Session mode | Pairing preset: **Chill** (≈30% easy games), **Fair** (mostly level-matched, ≈10% easy), **Hard** (allows 2–3 games in a row) |
| Formats | Standard: singles, doubles. Fun: 1v2, 3v3, 4v4, 5v5 (5v5 uses two courts) |
| Calculated minimum | Minimum-games target estimated from courts, length, players, formats; operator can override |
| Open until | A court's closing time (session end or earlier). A reminder, never a hard stop |
| Booking ended | A court past its closing time |
| Venue | A place the club plays; the club's founding location is separate and fixed |
| Session record | Read-only view of a finalized or invalid session |

---

## 4. Players, identity, and presence

Rules: [Players](business_logic/product/queue/modules/players/README.md) ·
[Identity](business_logic/product/player-information/modules/identity/README.md)

| Term | Meaning |
|---|---|
| Saved club player | A player the club remembers. Not necessarily a formal member |
| Guest | Name-only entrant with no linked Player Information profile |
| Lookup pending | New player entered with a phone; matched or created when the session syncs |
| Unclaimed profile | Phone-linked identity not yet claimed through registration |
| Registered player | Claimed profile with required phone, email, and password |
| Player ID / RTR ID | Permanent identifier given on first profile sync, e.g. `RTR-PH-CEB-031526-0001`. Never a database key |
| Invite (link) | Link for a guest or unclaimed profile to create or claim an account. Never books a session |
| Present | Operator switch: the player is available to automatic generation |
| Available | Present **and** not on a court right now |
| Wait time | Minutes since the player's last game ended (or since marked present). Derived, never stored as a status |

Phones and emails are **never public**, never in search results, participant cards, exports, or error text.

---

## 5. Levels and ranking

Rules: [Ranking](business_logic/product/player-information/modules/ranking/README.md)

| Term | Meaning |
|---|---|
| Playing level | One of nine: Beginner, Intermediate, Advanced × Low, Mid, High (e.g. "Intermediate High") |
| Club assessment | The latest of the nine levels one club assigned to a player |
| Session playing level | The level the club set for this session; locks at Start session (late entries lock when added) |
| Shared rank | Cross-club rank shown in Player Information: 70% club assessments, 30% performance, last three months |
| Overall leaderboard | The one global ROTRA leaderboard. No city or club filters in v1 |
| Needs reassessment | Rank still visible after three months without play; returning to the leaderboard needs reassessment |

---

## 6. Queueing

Rules: [Queueing](business_logic/product/queue/modules/queueing/README.md)

| Term | Meaning |
|---|---|
| Waiting queue | **One** ordered match list shared by all courts. Order is a suggestion; any ready match can start |
| Manual | Operator builds a lineup slot by slot |
| Make match | Operator picks players; ROTRA picks the format from the count and balances teams |
| Suggest | ROTRA proposes one lineup with a reason, for approval |
| Auto queue | Generates several waiting matches at once (operator picks 2/3/4/6); starts still need confirmation |
| Regenerate | Rebuilds unprotected waiting matches; keeps protected manual ones |
| Protected manual match | Created or edited by the operator; survives regeneration unless it needs attention |
| Match number | Fixed creation-order number: Match 1, 2, … Never reused |
| Queue position | Current place in the waiting queue: #1, #2, … Changes as matches move |
| Ready to start | Waiting match whose players are present and free, with enough free courts |
| Next eligible | First ready match in queue order, proposed to a free court |
| Blocked | Waiting match held only because a player is playing or courts are busy |
| Needs attention | Waiting match with a broken lineup (incomplete, or a player not present) |

---

## 7. Matches and results

Rules: [Matches](business_logic/product/queue/modules/matches/README.md) ·
[Results](business_logic/product/queue/modules/results/README.md)

| Term | Meaning |
|---|---|
| Standard match | Singles or doubles; can count toward long-term performance |
| Fun match | 1v2, 3v3, 4v4, 5v5; counted locally only |
| Start match | Explicit operator confirmation that puts a match on a court. Never automatic |
| Substitution | Swapping a player mid-match. Neither the outgoing nor incoming player gets credit for that game |
| Match done | Confirmed winner (+ optional score). **Permanent**; frees the court(s) |
| Invalid match | No game, win, loss, or minimum-game credit. **Permanent**; frees the court(s) |
| Live leaderboard | Operator's running standings during the session; not official history |
| Session done | Online finalization after sync and reconciliation, with no game in play |
| Invalid session | Unrecoverable or untrusted records; no performance contribution, no slides |
| Result slides | Three private slides made at valid Session done: Standings, Awards (MVP, Most Improved), Off Day |
| Off Day | Below-baseline session performance. Private unless explicitly included when sharing |
| Publish | Optional sharing of chosen slides on the public page. Separate from profile/rank sync |

---

## 8. Offline and sync

Rules: [Offline](business_logic/product/queue/modules/offline/README.md) ·
[Experience contract § Save and sync language](screens/product/experience-contract.md#save-and-sync-language)

| Term | Meaning |
|---|---|
| Download (a session) | Copy a prepared session to this device so it can run offline |
| This device | The operator's current browser/device and what it has downloaded |
| Pending change | A local, durably saved change the server has not accepted yet |
| Reconciliation | Matching records across devices before Session done |
| Conflict | Two records disagree; needs operator review. Never resolved by last-write-wins |
| Interruption recovery | Continuing a session after a device was lost or closed mid-session |

Use the sync labels exactly: **Saving on this device**, **Saved on this device · waiting to sync**,
**Syncing**, **Synced**, **Needs attention**, **Changes could not be saved**.

---

## 9. Financials

Rules: [Financials](business_logic/product/queue/modules/financials/README.md)

| Term | Meaning |
|---|---|
| Cost estimate | Optional court + shuttle + entrance-fee cost for one session, with payment per player and profit or loss |
| Break-even | Total estimated cost ÷ players, rounded up. The default payment per player |
| Payment per player | What each player pays: break-even, or a custom amount (showing profit or loss) |
| Entrance fee | Per-head venue cost, listed for transparency, covered by the payment per player |
| Payments checklist | Manual paid / not-paid tick per player per session. **ROTRA never collects money** |
| Inventory | Club's list of shuttlecocks, equipment, and items with stock and cost per unit |
| Running low | Inventory item with 2 or fewer left |

Financial estimates are operator-only: never on public pages or exports. Money is integer centavos (PHP).

---

## 10. Admin and licensing

Rules: [Clubs and licenses](business_logic/product/admin/modules/clubs-licenses/README.md) ·
[Configuration](business_logic/product/admin/modules/configuration/README.md) ·
[Player management](business_logic/product/admin/modules/player-management/README.md)

| Term | Meaning |
|---|---|
| License | Paid monthly or yearly access for a club, activated manually in Admin after payment outside ROTRA |
| License term | One activated period (start, end, amount). Expiry blocks access except finishing an active session |
| Club price | Each club's own monthly and yearly price. Yearly must be less than 12 × monthly |
| Free (tester) club | Club with ₱0 license terms; expiry still works the same |
| Add club | The only way a club is created: by the platform owner. There is no club application flow |
| Club name change | A request from the club, approved in Admin. The old name stays until approved |
| Contact-change request | A registered player's request to change phone or email, approved in Admin |
| Public-page retention | How long public session pages stay up; deleting a page never deletes history |
| Ranking settings | Admin-adjustable weights (70/30) and match requirement. Saving makes a new version |
| Feature flag | Platform-wide on/off switch with a fixed key the apps check. New flags start off |

---

## 11. Documentation IDs

Screen and dialog IDs name **documentation surfaces, not routes or component names**.

| Prefix | Meaning | Index |
|---|---|---|
| `Q-` | Queue screens, e.g. `Q-CONSOLE`, `Q-SETUP`, `Q-PUBLIC-DETAILS` | [Queue screens](screens/product/modules/queue/README.md) |
| `P-` | Player Information screens, e.g. `P-LEADERBOARD`, `P-OWN-PROFILE` | [Player screens](screens/product/modules/player-information/README.md) |
| `A-` | Admin screens, e.g. `A-CLUBS`, `A-LICENSE` | [Admin screens](screens/product/modules/admin/README.md) |
| `D-` | Confirmation dialogs, e.g. `D-WINNER`, `D-SESSION-DONE` | [Dialogs](screens/product/dialogs.md) |

Tickets and PRs cite these IDs so a reviewer can find the contract and the prototype screen.

---

## 12. Term → code identifier

Proposed names that keep mock types, components, and the later Prisma models aligned. Table names come
from the [database design](database_design/product/README.md). Add a row here **before** inventing a new one.

| Term | TS type / Prisma model | Table (proposed) | Notes |
|---|---|---|---|
| Club | `Club` | `clubs` | |
| Club account | `ClubAccount` | `club_accounts` | |
| Venue | `ClubVenue` | `club_venues` | |
| License term | `ClubLicenseTerm` | `club_license_terms` | |
| Saved club player | `ClubPlayer` | `club_players` | `playerId` null = guest |
| Queue Session | `QueueSession` | `queue_sessions` | `state`: `prepared` · `active` · `finalizing` · `completed` · `invalid` |
| Join request | `SessionJoinRequest` | `session_join_requests` | `status`: `pending` · `confirmed` · `declined` |
| Waitlist entry | `SessionWaitlistEntry` | `session_waitlist` | Ordered by `added_at` |
| Roster entry (slot) | `SessionPlayer` | `session_players` | Slot order is `confirmed_at` |
| Court in a session | `SessionCourt` | `session_courts` | |
| Session finalization | `SessionFinalization` | `session_finalizations` | `state`: `running` · `committed` · `done` · `failed`; `stage`: `checking` · `finishing` · `player_records` · `slides` (`FinalizationStage`) |
| Session done review | `SessionDoneReview` | — | Read model for Q-SESSION-DONE: games recorded, participants, pending changes, games in play, unplayed waiting, below minimum |
| Session record | `SessionRecordSummary` | — | Read model for Q-HISTORY totals; an invalid session counts no games or players |
| Match | `Match` | `matches` | `state`: `waiting` · `active` · `completed` · `invalid`; `origin`: `manual` · `suggested` · `auto` |
| Match format | `MatchFormat` | — | `singles` · `doubles` · `fun_1v2` · `fun_3v3` · `fun_4v4` · `fun_5v5` |
| Session mode | `SessionMode` | — | `chill` · `fair` · `hard` |
| Player | `Player` | `players` | Global identity across clubs |
| Ranking settings | `RankingSettings` | `ranking_policy_versions` | Configured assessment weight and match requirement |
| Player rank | `PlayerRank` | `player_rank_current` | Public shared-rank projection; no numerical formula in the mock phase |
| Club assessment | `ClubAssessment` | `club_assessments` | |
| Inventory item | `InventoryItem` | `inventory_items` | |
| Cost estimate | `SessionCostEstimate` | `session_cost_estimates` | |
| Feature flag | `FeatureFlag` | `feature_flags` | |

URL segments, component names, and query keys use the same words: `sessions/[sessionId]`, `MatchCard`,
`['queue-session', id]`. Never use a screen ID as a route.

---

## 13. Easily confused — check before you write

| Don't mix up | Difference |
|---|---|
| Match done ↔ Session done | One game's permanent result vs. the whole session's online finalization |
| Waiting queue ↔ Waitlist ↔ Join request | Matches waiting for courts vs. players waiting for a slot vs. a guest asking for a slot |
| Match number ↔ Queue position | Fixed creation number vs. current, changing place in the queue |
| Present ↔ Available ↔ Wait time | Operator switch vs. present and not playing vs. derived minutes |
| Playing level ↔ Club assessment ↔ Session playing level ↔ Shared rank | The nine-level scale vs. one club's latest level vs. the level locked for one session vs. cross-club rank |
| Blocked ↔ Needs attention | Temporarily busy players/courts vs. a broken lineup |
| Invalid match ↔ Invalid session | One game with no credit vs. a whole session with untrusted records |
| Publish ↔ sync | Optional public sharing vs. automatic profile and rank updates |
| Guest ↔ Unclaimed profile ↔ Registered player | Name only vs. phone-linked but unclaimed vs. claimed with a password |
| Cost estimate ↔ Payments checklist | Planning numbers vs. a manual paid tick. Neither collects money |

---

## 14. Words that mean "not v1" — stop and ask

If a task, ticket, or old note uses one of these, it refers to a removed or deferred feature:

MMR · EXP · tiers · peer reviews / Skill Rating (six dimensions) · Umpire / Quick Umpire · tournaments ·
Quick Session · Friendly session · "Fun Games" session type · Facebook login · player self-booking ·
collecting fees, receipts, payment gateways · public Matches or Chat tabs · live spectator feeds · City /
National / World categories · multiple managers per club · World discovery.
