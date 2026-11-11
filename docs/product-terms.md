# Product terms — ROTRA v1

**Last verified:** 2026-11-12 · **Owner:** product owner · **Single source of vocabulary.** If a word here
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
| An invalid game is "invalid", never "void" or "unscored" ("Cancelled" is only a session status, never a match's) | Invalid match | Voided, Unscored, Cancelled |

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
| Session states | **Prepared** (set up, not started) → **Active** (running) → **Finalized** (validly finished) or **Invalid** (untrusted records). A prepared session can instead become **Cancelled** (called off before Start session; final). DB proposal adds a transient `finalizing` and names finalized `completed` |
| Slot | An operator-confirmed place in a session |
| Slot budget | Players per court (club default 8) × courts = number of slots |
| Waitlist | Players awaiting admission; prepared placement is first-come, while during an active session the Queue Master may choose anyone |
| Session link | The session's public page URL. Guests can send a join request from it |
| Join request | A request for a slot from the session link, by a guest or a signed-in ROTRA player ([D-2026-11-09-02](mvp/decisions.md#d-2026-11-09-02)). Holds nothing until the QM confirms or declines. Not a Match request |
| Drop-out notice | **I can't make it** from a confirmed signed-in player before start. Shows under **Requests** (“Can't make it”); the slot frees only when the QM taps **Remove from roster** ([D-2026-11-09-03](mvp/decisions.md#d-2026-11-09-03)) |
| Requests · N | Before Start: the preparation card for join requests and drop-out notices. After Start: the **Match requests · N** button at the upper right of the live console, match requests only, in the warn colour while any is waiting; join requests close at Start ([D-2026-11-09-05](mvp/decisions.md#d-2026-11-09-05), [D-2026-11-11-11](mvp/decisions.md#d-2026-11-11-11)) |
| Bagging mode | A session-wide switch in Generate matches (doubles only). While it is on, the **Bagging pairs** list guides every Generate tab, including Catch Up; Auto Queue and hand-built matches are untouched ([D-2026-11-11-11](mvp/decisions.md#d-2026-11-11-11)) |
| Bagging pair | Two players the Queue Master keeps together as partners for the games picked in **ALL 1 … N** (N = the session minimum). A player is in one pair at a time; an applicable pair with both players free leads the next doubles draft |
| Move to waitlist | The Queue Master's action on a roster player (before Start, and after Start when the player is not in a match) that puts them at the front of the waitlist, keeping their level and paid mark. A player does the same to themselves with **Move me to the waitlist** on the session page |
| Over capacity | A roster past its slot count after the Queue Master adds someone anyway (**Add NAME anyway?**); the count reads 25/24 in the warn colour and expected games are recomputed |
| Participant profile card | The dialog a signed-in player opens by tapping a participant tile on the session page (and the Queue Master opens from any avatar): banner, picture, name, level, status, About and 90-day stats. Private players show only their picture and banner; guests show a “no profile yet” card |
| Session invite | A confirmed or waitlisted player's share card and link for one session, carrying a short invite code; the QM's join request card says “Invited by NAME” ([D-2026-11-09-08](mvp/decisions.md#d-2026-11-09-08)) |
| Join a slot · Be waitlisted | The player's choice on a join request ([D-2026-11-11-02](mvp/decisions.md#d-2026-11-11-02)): a slot, or a waitlist place. Join a slot is unavailable before start while every slot is taken. Code value `placement`: `slot` · `waitlist` · `from_waitlist` |
| Join from waitlist | A waitlisted signed-in Player's request for a slot while slots are open; the Queue Master confirms it (**Give slot** / **Admit player**) and it never overfills before start ([D-2026-11-11-02](mvp/decisions.md#d-2026-11-11-02)) |
| Session mode | Pairing preset: **Chill** (≈30% easy games), **Fair** (mostly level-matched, ≈10% easy), **Hard** (allows 2–3 games in a row) |
| Formats | Standard: singles, doubles. Fun: 1v2, 3v3, 4v4, 5v5 (5v5 uses two courts) |
| Calculated minimum | Minimum-games target estimated from courts, length, players, formats; operator can override |
| Planned start | A court booking start; the court is unavailable for dispatch until then |
| Open until | A court's planned end, fixed or following session end; a reminder, never a hard stop |
| Booking ended | A court past its closing time, free or with a match on it (warning style) |
| Short on players | Live console banner when the present players can't fill every open court: "7 players present: enough for 1 doubles court. 3 sit out each game." A free court that can't get a match says "Not enough free players." |
| Planned end | The session's scheduled end (in setup, also a court's). A reminder: the session never closes at it. Past it the console says "Planned end passed N ago" |
| Set end time | Live action in **Courts and time** (header button, formerly **Extend time**): move the session end to any time after now; **Extend 30 min / 60 min** are shortcuts. The start time is fixed after Start session |
| Venue | A place the club plays; the club's founding location is separate and fixed |
| Session record | Read-only view of a finalized, invalid or cancelled session |
| Cancel session | Preparation action that calls off a prepared session before Start session. Final; optional reason. Not "Delete session" (a session nobody is confirmed in) |

---

## 4. Players, identity, and presence

Rules: [Players](business_logic/product/queue/modules/players/README.md) ·
[Identity](business_logic/product/player-information/modules/identity/README.md)

| Term | Meaning |
|---|---|
| Saved club player | A player the club remembers. Not necessarily a formal member |
| Guest | Name-only entrant with no linked Player Information profile |
| Lookup pending | New player entered with a phone; matched to a registered player when the session syncs, or kept as the club's unclaimed profile ([D-2026-11-11-03](mvp/decisions.md#d-2026-11-11-03)) |
| Unclaimed profile | A club's saved player with a phone who hasn't registered. Lives only in that club: no RTR ID, never found by another club ([D-2026-11-11-03](mvp/decisions.md#d-2026-11-11-03)) |
| Registered player | Claimed profile with required phone, email, and password |
| Always private | The strictest **Profile visibility** level (Public · Private · Always private; default Private). Nobody but the player sees their name, level and games; the picture and banner stay public ([D-2026-11-11-11](mvp/decisions.md#d-2026-11-11-11)) |
| Hide from Player Information | The player's switch **Hide me from Player Information**: clubs can't find them in Queue's Add player › Player Information search or by RTR ID, and they're left out of public club page member lists; Saved players, Admin and the public session page are unaffected ([D-2026-11-11-11](mvp/decisions.md#d-2026-11-11-11)) |
| Profile banner | The strip across the top of a player's profile card, public like the picture. A player picks one of the predefined banners the platform owner manages in Admin › Settings › Profile banners; no uploads ([D-2026-11-11-11](mvp/decisions.md#d-2026-11-11-11)) |
| Public club page | A club's public page at `/clubs/[clubId]` in Player Information (epic P07): header, members, upcoming sessions and a calendar. Not the club's session page and not the invite link ([D-2026-11-11-11](mvp/decisions.md#d-2026-11-11-11)) |
| Player ID / RTR ID | Permanent identifier given when the player registers, e.g. `RTR-PH-CEB-031526-0001` ([D-2026-11-11-03](mvp/decisions.md#d-2026-11-11-03)). Never a database key |
| Invite (link) / Registration invite | Per-guest link for a guest or unclaimed profile to create or claim an account. Never books a session ([D-2026-11-09-06](mvp/decisions.md#d-2026-11-09-06)) |
| Club invite code | The secret `k` value of the club invite link (`/register/[clubId]?k=<code>`), stored in `clubs.invite_code`; every club has one, a plain link without a valid code is refused, and Regenerate link replaces it ([D-2026-11-12-01](mvp/decisions.md#d-2026-11-12-01)) |
| Club invite link | One standing link per club (`/register/[clubId]`) with a share card; a new person registers through it and joins the club's Saved players (“Joined via club link”), a signed-in player taps once to join ([D-2026-11-09-06](mvp/decisions.md#d-2026-11-09-06), [D-2026-11-09-08](mvp/decisions.md#d-2026-11-09-08)) |
| Joined via | How a saved player entered the club: “Joined via club link”, “Joined via session link” or “Added by the club” ([D-2026-11-09-06](mvp/decisions.md#d-2026-11-09-06)) |
| Guest linking | The QM merges a guest record into a saved player: **Link** on a join request whose phone matches, or **Link to saved player…** on the guest's record. Nothing merges by itself ([D-2026-11-09-06](mvp/decisions.md#d-2026-11-09-06)) |
| Self check-in | **I'm here** on the session page sets Present for a confirmed signed-in player; the roster shows “Checked in themselves · TIME”, the QM's last action wins, and the club setting **Players can check themselves in** can turn it off ([D-2026-11-09-03](mvp/decisions.md#d-2026-11-09-03)) |
| Present | Operator switch: the player is available to automatic generation |
| Available | Present **and** not on a court right now |
| Wait time | Minutes since the player's last game ended (or since marked present). Derived, never stored as a status |

Phones and emails are **never public**, never in search results, participant cards, exports, or error text.

**Owner decisions, October 28, 2026:** a phone-linked profile and permanent RTR ID are matched/created as soon as the entry successfully syncs, without waiting for Session done. After a guest's identity is confirmed and linked, earlier valid games also contribute to personal history and ranking under the existing eligibility and rolling-window rules. Original dates, club history, and permanent results are preserved; linking never counts a game twice. Identity-confirmation evidence and mistaken-link handling still need specification.

**Updated November 11, 2026 ([D-2026-11-11-03](mvp/decisions.md#d-2026-11-11-03)):** an unclaimed profile stays in its club and gets no RTR ID; the RTR ID is given on registration. On registration, every club's record with the same phone links to the account automatically, and the history rules above apply.

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
| Main Queue | Accepted shared waiting list used for dispatch |
| Generate matches | Five alternative generation tabs holding drafts until explicitly transferred to the Main Queue. Formerly called Auto Queue; renamed 2026-11-06. Never "Generate Queues" (a session has one queue) |
| Auto Queue · Manual Queue | The per-session court-fill switch on the Courts section (owner decision, November 6, 2026). **Manual Queue** (default): a free court proposes the next ready match and the operator taps **Put on court**. **Auto Queue**: ROTRA puts the next ready match On court by itself. Neither mode ever starts a match |
| Put on court | Places a waiting match on a free court (two for 5v5). The match becomes On court; nothing starts |
| Send back to queue | Returns an On court match to the **top** of the queue and frees its court |
| Swap with the queue | Puts the next ready waiting match on an On court match's court and moves the On court match into that match's queue place |
| Available Players / Plan Ahead / Longest Wait / Fewest Games | Generate matches strategies |
| Catch Up | Generate matches strategy with an explicitly chosen game target, separate from the session minimum. “Games each player should reach” prioritizes eligible players below that number; completed games, Main Queue waiting assignments and earlier drafts in this batch count toward reaching it in the plan. Planned games are not completed results |
| Draft | A suggested future lineup held outside the Main Queue; neither queued nor played |
| Regenerate | Rebuilds unprotected waiting matches; keeps protected manual ones |
| Protected manual match | Created or edited by the operator; survives regeneration unless it needs attention |
| Match number | Fixed creation-order number: Match 1, 2, … Never reused |
| Queue position | Current place in the waiting queue: #1, #2, … Changes as matches move |
| Ready to start | Waiting match whose players are present and free, with enough free courts |
| Next eligible | First ready match in queue order, proposed to a free court |
| Blocked | Waiting match held only because a player is busy (On court or Playing) or courts are busy |
| Needs attention | Waiting match with a broken lineup (incomplete, or a player not present) |

---

## 7. Matches and results

Rules: [Matches](business_logic/product/queue/modules/matches/README.md) ·
[Results](business_logic/product/queue/modules/results/README.md)

| Term | Meaning |
|---|---|
| Standard match | Singles or doubles; can count toward long-term performance |
| Fun match | 1v2, 3v3, 4v4, 5v5; counted locally only |
| On court | Match status between Waiting and Playing: placed on a court, not started. Lineup can still change; players are busy. Court chip **Getting ready** |
| Getting ready · Playing | Court card chips for an On court match and a started match. Playing also has a steady accent glow |
| Start match | Explicit operator tap that starts an On court match; the timer starts here. Never automatic, in Manual Queue or Auto Queue. Not "Start game" |
| Substitution | Swapping a player in a **Playing** match. By default neither the outgoing nor incoming player gets credit for that game. A replacement while On court is a lineup change, not a substitution |
| Game credit (Who gets this game?) | The substitution choice: Nobody (default), the incoming player, or the outgoing player, never both. The credited player gets the game, minimum credit and win/loss for the session only, never long-term performance or rank |
| Match done | Confirmed winner (+ optional score). **Permanent**; frees the court(s) |
| Invalid match | No game, win, loss, or minimum-game credit. **Permanent**; frees the court(s) |
| Live leaderboard | Operator's running standings during the session; not official history |
| Session done | Online finalization after sync and reconciliation, with no game in play |
| Invalid session | Unrecoverable or untrusted records; no performance contribution, no slides |
| Cancelled session | A prepared session called off before Start session (owner decision, November 6, 2026). Final, optional reason; roster, waitlist and payment marks kept read-only; refunds happen outside ROTRA; join requests close; counts nowhere. Code value `cancelled`. Not an Invalid session, and not an invalid match |
| Result slides | Three private slides made at valid Session done: Standings, Awards (MVP, Most Improved), Off Day |
| Off Day | Below-baseline session performance. Private unless explicitly included when sharing |
| Publish | Optional sharing of chosen slides on the public page. Separate from profile/rank sync |
| Match request | A present, signed-in, confirmed player asks for a specific game (format from the six pills the session's **Players can request** setting allows, partners, opponents or “Anyone”). The QM sees it in **Requests › Match** with each player's games against the minimum, level and “On Court 2” / “In queue #3”, then **Add to queue** (a waiting match at the end of the Main Queue, Anyone spots filled from present players with the fewest games) or **Decline**. Closes by itself when anyone named stops being present or the session ends ([D-2026-11-09-05](mvp/decisions.md#d-2026-11-09-05)) |

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
| Payments checklist | Manual record per player per session: a quick paid tick or the amount received (#479). **ROTRA never collects money** |
| Payment status | Amount received vs. today's payment per player (#479): **Paid** (equal), **Partial** (less; “₱X left”), **Reimburse** (more; “₱X to return”, a reminder only, never a refund), **Unpaid** (nothing). Code `PaymentStatus` kinds `paid` · `partial` · `reimburse` · `unpaid` |
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
| Device | `Device` | `devices` | A browser on a club account; not a person. Enrollment rules pending #246 |
| Device stream | `DeviceSessionStream` | `device_session_streams` | One device's numbered operations for one session (`generation_no` per re-enrollment) |
| Sync change | `SyncChange` | `sync_operations` | Device-local display projection in the mock phase |
| Operation receipt | `SyncOperation` | `sync_operations` | Stored, immutable upload envelope with its state: `received` · `waiting` · `accepted` · `rejected` · `conflicted` |
| Sync status | `SyncStatus` | — | Device connectivity, pending count and problem projection |
| Session integrity | `SessionIntegrity` | — | Mock completeness and recovery state; no gap detection |
| Sync conflict | `SyncConflict` | `sync_conflicts` | Read-only device evidence; authority-selection rule pending |
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
| Admin account | `AdminAccount` | `admin_accounts` | Platform owner only |
| Admin audit event | `AdminAuditEvent` | `admin_audit_events` | Append-only "Record of actions" line; the summary never carries passwords or tokens |
| Club | `Club` | `clubs` | |
| Club account | `ClubAccount` | `club_accounts` | |
| Club name change | `ClubNameChangeRequest` | `club_name_change_requests` | `state`: `pending` · `approved` · `rejected` · `cancelled`; one pending per club; takes effect only when the platform owner approves |
| Venue | `ClubVenue` | `club_venues` | |
| License term | `ClubLicenseTerm` | `club_license_terms` | `plan`: `Monthly` · `Yearly`; idempotent on `sourceCommandId`; a free club's term is ₱0 with `paidOn` null |
| Club access | `ClubAccessState` | — | Admin projection from terms and today: `active` · `expired` · `scheduled` · `none` (Queue's gate state is `ClubAccess`) |
| Club expiry cycle | `ClubExpiryCycle` | `club_expiry_cycles` | Six-month public-page countdown from the first unlicensed day; renewal cancels it, a later expiry starts a new one. The mock records cancelled cycles in `ClubRetentionRecord` and derives the running one |
| Public-page retention | `RetentionState` | — | Projection: `none` · `restored` · `stale` · `due` · `failed` · `deleted` |
| Club entitlement | `ClubEntitlement` | `club_entitlements` | Projection of effective access; not stored in the mock (computed with `accessOf`) |
| Saved club player | `ClubPlayer` | `club_players` | `playerId` null = guest; `joinedVia`: `club_link` · `session_link` · `added_by_club`; `linkedToClubPlayerId` after guest linking ([D-2026-11-09-06](mvp/decisions.md#d-2026-11-09-06)) |
| Saved player statistics | `SavedPlayerStats` | — | Derived club-wide totals; `SavedPlayerStatsCarousel` renders them; `useSavedPlayerStats` reads them |
| Queue Session | `QueueSession` | `queue_sessions` | `state`: `prepared` · `active` · `finalizing` · `completed` · `invalid` · `cancelled` (November 6, 2026; from `prepared` only), with `cancelled_at` and a nullable `cancel_reason` (code: `cancelledAt`, `cancelReason`) |
| Join request | `SessionJoinRequest` | `session_join_requests` | `status`: `pending` · `confirmed` · `declined` · `closed` (November 6, 2026: pending requests closed when the session is cancelled; not a decline); `playerId`, `inviteCodeId`, `linkedClubPlayerId` for a signed-in player, a Session invite and QM guest linking; `placement`: `slot` · `waitlist` · `from_waitlist` ([D-2026-11-11-02](mvp/decisions.md#d-2026-11-11-02)) |
| Match request | `MatchRequest` | `match_requests` | `status`: `open` · `added` · `declined` · `cancelled` · `closed`; `matchId` set by **Add to queue** ([D-2026-11-09-05](mvp/decisions.md#d-2026-11-09-05)) |
| Drop-out notice | `SessionDropOutNotice` | `session_drop_out_notices` | `status`: `open` · `closed`; `decision`: `kept` · `removed` ([D-2026-11-09-03](mvp/decisions.md#d-2026-11-09-03)) |
| Session invite | `SessionInviteCode` | `session_invite_codes` | One `code` per player and session ([D-2026-11-09-08](mvp/decisions.md#d-2026-11-09-08)) |
| Self check-in | `SessionPlayer.selfCheckedInAt` | `session_players.self_checked_in_at` | Null once the QM turns Present off; `left_at` for **I'm leaving** ([D-2026-11-09-03](mvp/decisions.md#d-2026-11-09-03)) |
| Waitlist entry | `SessionWaitlistEntry` | `session_waitlist` | Ordered by `added_at` |
| Roster entry (slot) | `SessionPlayer` | `session_players` | Slot order is `confirmed_at` |
| Court in a session | `SessionCourt` | `session_courts` | `startsAt` (`starts_at`) is the planned start, `openedEarlyAt` (`opened_early_at`) the Start anyway time; `openUntil: null` follows session end. `useUpdateCourt` edits booking windows; a used start is fixed |
| Session finalization | `SessionFinalization` | `session_finalizations` | `state`: `running` · `committed` · `done` · `failed`; `stage`: `checking` · `finishing` · `player_records` · `slides` (`FinalizationStage`) |
| Session done review | `SessionDoneReview` | — | Read model for Q-SESSION-DONE: games recorded, participants, pending changes, games in play, unplayed waiting, below minimum |
| Session record | `SessionRecordSummary` | — | Read model for Q-HISTORY totals; an invalid session counts no games or players |
| Result snapshot | `SessionResultSnapshot` | `session_result_snapshots` | Private; generated at the finalization `slides` stage with `calculationVersion: 'prototype-reference'`; never for an invalid session |
| Standings row | `StandingRow` | — | One line of the snapshot's standings; positions are unique |
| Award history | `PlayerAwardHistory` | — | Per club player: prior club sessions and baseline win rate behind Most Improved / Off Day |
| Publication | `SessionPublication` | `session_publications` | `publishedSlides` ⊆ `standings` · `awards`; `includeOffDay` is explicit on every publish |
| Publication event | `SessionPublicationEvent` | `session_publication_events` | Append-only log of each publish (selection, Off Day choice, time) |
| Export frame | `ExportFrame` | `result_exports` | One Download images frame; `ExportFormat`: `story` (14 rows) · `feed` (10 rows) |
| Public session page | `PublicSessionPage` | `session_publications` public projection | Public-safe read model of a session by its slug, from the last synced state: details, participants (masked names, no contacts, level or presence), masked waitlist names, open slots, and only the published slides (Off Day only when included). `MyJoinRequest` is the visitor's own request status |
| Generate matches strategy | `AutoQueueMode` | — | `available` · `ahead` · `wait` · `fewest` · `catchup`; `AutoQueueCount` is an explicit 2/3/4/6 choice. Code names keep "AutoQueue" until the real-app ticket renames them; in copy this is **Generate matches**, not Auto Queue |
| Draft lineup | `AutoQueueDraftLineup` | — | Stable draft ID, strategy, lineup, reason and input fingerprint; never a match number |
| Draft batch | `AutoQueueDraftBatch` | — | One alternative tab; its stopping reason and optional Catch Up target |
| Draft workspace state | `AutoQueueDraftState` | — | Per-session in-memory batches, selection order and committed draft IDs; `useAutoQueueDrafts` reads it |
| Match | `Match` | `matches` | `state`: `waiting` · `on_court` · `active` · `completed` · `invalid` (`on_court` = On court, November 6, 2026; `active` = Playing); `origin`: `manual` · `suggested` · `auto`. `placedAt` (`placed_at`) when put on court; `startedAt` set only at Start match |
| Court fill mode | `CourtFillMode` (`courtFillMode`) | `queue_sessions.court_fill_mode` | `'manual'` (default) · `'auto'`: the Manual Queue \| Auto Queue switch |
| Substitution game credit | `SubstitutionCredit` (`creditTo` on a substitution) | `match_participations.credit_to`, on the incoming player's row | `none` (default) · `incoming` · `outgoing`; locks when the match is done or invalid |
| Match format | `MatchFormat` | — | `singles` · `doubles` · `fun_1v2` · `fun_3v3` · `fun_4v4` · `fun_5v5` |
| Session mode | `SessionMode` | — | `chill` · `fair` · `hard` |
| Player | `Player` | `players` | Global identity across clubs |
| Ranking settings | `RankingPolicyVersion` | `ranking_policy_versions` | One append-only saved version: weights in basis points (sum 10000) and the recent-standard-match threshold (1–40); the newest is in effect. `RankingSettings` {assessmentWeightPercent, matchRequirement} is the effective version's reader shape |
| Leaderboard entry | `LeaderboardEntry` | — | Public projection, no table; overall position comes from eligible fixture order |
| Player session record / player game | `PlayerSessionRecord` / `PlayerGame` | `player_match_facts` | Public read projection of valid finalized games |
| Player profile | `PlayerProfile` | — | Public identity, picture, and optional playing details; no contacts |
| Profile visibility | `profileVisibility` | `players.profile_visibility` | `public` · `private` (default) · `always_private`; replaces `profile_private` ([D-2026-11-12-01](mvp/decisions.md#d-2026-11-12-01)) |
| Hidden from Player Information | `hiddenFromDirectory` | `players.hidden_from_directory` | Boolean, default false; left out of Queue's Add player › Player Information and RTR ID search and of public club member lists |
| Profile banner | `bannerId` | `players.banner_id` → `profile_banners` | Null = default banner; library managed in Admin; the default is the first shown banner |
| Player account | `PlayerAccount` | `player_accounts` | Claimed sign-in link for a player; `MyAccount` is the owner-only read of it in the mock phase |
| Player private contact | `PlayerPrivateContact` | `player_private_contacts` | Phone, email and phone privacy; never in a public projection |
| Player social link | `PlayerSocialLink` | `player_social_links` | Facebook, Instagram, YouTube or LinkedIn URL; a description, never a sign-in method |
| Player claim link | `PlayerClaimLink` (`ClaimLink` in the mock) | `player_claim_links` | Club-issued registration link for one existing profile; shows a masked phone only |
| Contact-change request | `PlayerContactChangeRequest` (stored record) / `ContactChangeRequest` (the player's view) | `player_contact_change_requests` | A player's request to change their login phone or email; takes effect only after Admin approval and applying. One open at a time from the Player app. `status`: `pending` · `approved` · `applying` · `applied` · `rejected` · `failed`; `source`: `app` · `owner`; a retry keeps the same `providerOperationRef`. Admin reads it as `AdminContactRequestItem` / `AdminContactRequestDetail` (player, checks, next action) |
| History attribution | `PlayerHistoryAttribution` | `player_history_attributions` | Reviewed link from a club guest to a player so earlier valid games join their history; facts are never rewritten; revoked, never deleted |
| Projection job | `ProjectionJob` | `projection_jobs` | Retryable work from one source (finalization, assessment, attribution or ageing), unique per source, kind and version |
| Player rank | `PlayerRank` | `player_rank_current` | Public shared-rank projection; no numerical formula in the mock phase |
| Club assessment | `ClubAssessment` | `club_assessments` | |
| Inventory item | `InventoryItem` | `inventory_items` | |
| Shuttle plan line | `SessionShuttlePlanLine` | `session_shuttle_plan_lines` | Planned tubes from one inventory item |
| Payment mark | `SessionPaymentMark` | `session_payment_marks` | Amount received (`amountMinor`, #479) and when it was ticked or recorded |
| Cost estimate | `SessionCostEstimate` | `session_cost_estimates` | |
| Device | `Device` | `devices` | A browser on a club account; not a person. Enrollment rules pending #246 |
| Device stream | `DeviceSessionStream` | `device_session_streams` | One device's numbered operations for one session (`generation_no` per re-enrollment) |
| Sync change | `SyncChange` | `sync_operations` | Device-local display projection in the mock phase |
| Operation receipt | `SyncOperation` | `sync_operations` | Stored, immutable upload envelope with its state: `received` · `waiting` · `accepted` · `rejected` · `conflicted` |
| Sync status | `SyncStatus` | — | Device connectivity, pending count and problem projection |
| Session integrity | `SessionIntegrity` | — | Mock completeness and recovery state; no gap detection |
| Sync conflict | `SyncConflict` | `sync_conflicts` | Read-only device evidence; authority-selection rule pending |
| Feature flag | `FeatureFlag` | `feature_flags` | |

URL segments, component names, and query keys use the same words: `sessions/[sessionId]`, `MatchCard`,
`['queue-session', id]`. Never use a screen ID as a route.

---

## 13. Easily confused — check before you write

| Don't mix up | Difference |
|---|---|
| Match done ↔ Session done | One game's permanent result vs. the whole session's online finalization |
| Waiting queue ↔ Waitlist ↔ Join request | Matches waiting for courts vs. players waiting for a slot vs. a guest asking for a slot |
| Join request ↔ Match request ↔ Drop-out notice | Asking for a slot vs. a present player asking for a specific game vs. a confirmed player saying they can't come. Join requests and drop-out notices live in the preparation Requests card; match requests live in the live console's **Match requests · N** button |
| Match number ↔ Queue position | Fixed creation number vs. current, changing place in the queue |
| Present ↔ Available ↔ Wait time | Operator switch vs. present and not playing vs. derived minutes |
| Playing level ↔ Club assessment ↔ Session playing level ↔ Shared rank | The nine-level scale vs. one club's latest level vs. the level locked for one session vs. cross-club rank |
| Blocked ↔ Needs attention | Temporarily busy players/courts vs. a broken lineup |
| Generate matches ↔ Auto Queue | The draft generator vs. the court-fill switch (before November 6, 2026, "Auto Queue" meant the generator) |
| Put on court ↔ Start match | Places a match on a court (On court, Getting ready) vs. starts it (Playing, timer runs) |
| Invalid match ↔ Invalid session | One game with no credit vs. a whole session with untrusted records |
| Invalid session ↔ Cancelled session | A session that ran but whose records can't be trusted vs. one called off before it started |
| Publish ↔ sync | Optional public sharing vs. automatic profile and rank updates |
| Guest ↔ Unclaimed profile ↔ Registered player | Name only vs. club record with a phone, not registered vs. claimed with a password. Only registered players are found across clubs |
| Cost estimate ↔ Payments checklist | Planning numbers vs. a manual paid tick. Neither collects money |

---

## 14. Words that mean "not v1" — stop and ask

If a task, ticket, or old note uses one of these, it refers to a removed or deferred feature:

MMR · EXP · tiers · peer reviews / Skill Rating (six dimensions) · Umpire / Quick Umpire · tournaments ·
Quick Session · Friendly session · "Fun Games" session type · Facebook login · player self-booking ·
collecting fees, receipts, payment gateways · public Matches or Chat tabs · live spectator feeds · City /
National / World categories · multiple managers per club · World discovery.
