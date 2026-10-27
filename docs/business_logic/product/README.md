# ROTRA ecosystem v1

**Status:** Target business behavior agreed October 25, 2026, updated October 26, 2026 from the [ROTRA Queue prototype](../../frames/queue-app/rotra-queue.html); not verified as implemented.

ROTRA helps clubs run badminton sessions and gives players a lasting identity and performance record. V1 focuses on operating a whole club session with little administrative work, including when the venue loses internet.

## Products

| Product | Purpose | Scope |
|---|---|---|
| [Queue](queue/README.md) | Club operator prepares players, manages matches/courts, and finalizes sessions | Main v1 focus |
| [Player Information](player-information/README.md) | Public profiles, shared ranks, and overall leaderboard; personal profile editing | Lean v1 |
| [Admin](admin/README.md) | Platform owner manages clubs, licenses, users, feature flags, and settings | Supporting v1 |
| World | Nearby-club discovery | V2; separate discussion, no further specification here |

## Accounts and ownership

- Every Queue Session belongs to a club. No standalone or player-managed sessions.
- Each club has a dedicated username and password. Owner/manager, club operator, and Queue Master are one operating authority in v1.
- Individual manager accounts, delegated club administrators, and multiple-manager permissions are deferred. Device recovery is not a multiple-manager feature.
- The club account needs a paid license, manually activated in Admin after payment outside ROTRA.
- Only one session per club can be active at a time.
- A club has a fixed founding location but may operate at different venues.
- Players need no account to participate. The operator adds and confirms every slot.

## End-to-end promise

1. The platform owner activates a monthly or discounted yearly club license.
2. The operator creates a session online — optionally estimating its costs to set a fair fee — prepares players/settings, and downloads it.
3. The operator marks presence and prepares a shared waiting queue using Manual, Make match, Suggest, or Auto queue.
4. The operator confirms match starts, handles substitutions, and confirms a winner or invalid match, watching the live leaderboard.
5. Online, with no game still in play, the operator reconciles any missing/conflicting device records and presses **Session done**.
6. Valid finalization updates eligible player profiles and rankings and creates private result slides.
7. The operator separately decides which slides to publish or download.

## Scope boundaries

| Included | Deferred or excluded |
|---|---|
| Club credential and manual licensing | Self-service billing; individual manager permissions |
| Operator entry and saved club players; slot budget (players per court) with an operator-managed waitlist | Player slot requests/self-service sessions; detailed rest/eating statuses |
| Optional scores or winner-only completion | Mandatory scorekeeping; editing confirmed results |
| Offline downloaded sessions | Entirely offline creation or finalization |
| Public Details and Participants page | Public Matches and Chat tabs; required live spectator feeds |
| One assessment/performance-based rank | Automatically inheriting old Skill Rating/MMR/EXP/tier systems |
| One overall leaderboard | City/club filters; City/National/World competition categories |
| Optional session cost estimate (courts, shuttlecocks, misc entrance fees) with a payment per player that is break-even or a custom amount showing profit or loss; manual paid / not-paid checklist per session; club inventory with manual stock | Collecting fees in ROTRA, receipts, per-player bills, payment gateways, automatic stock deduction |
| Live session leaderboard for the operator | Public live scores or standings during play |

The old Umpire product, peer reviews, tournaments, gamification, and broad membership workflows have not been accepted into this v1 reset.

## Authority and integration

The club's judgment controls local levels and lineups. Automatic modes are presets, not enforced rules. Minimum-game targets take scheduling priority but do not prevent session closure.

Confirmed winners and invalid-match decisions are permanent, including for Admin. Inter-device reconciliation determines the authoritative record; it is not permission to edit an uncontested confirmed result.

| Event | Business effect |
|---|---|
| Roster assessment saved | Updates that club's assessment and immediately influences shared rank when online |
| Match done | Locks result, releases court(s), records session results |
| Valid Session done | Syncs eligible profiles and completed-session performance; generates private slides |
| Publish/download | Shares optional club-culture content; does not control rank updates |
| License expiry | Blocks club access except completion/sync of an already-active session |

Offline edits remain pending until connectivity returns. Transaction/event design remains implementation work. See [open decisions](open-decisions.md).
