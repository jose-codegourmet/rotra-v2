# 18 — Canonical Rules

## Overview

This document contains the non-negotiable, system-level rules that govern the entire platform. These rules must be enforced at the server/business logic layer — not just the UI. Any feature, edge case, or design decision that conflicts with these rules requires an explicit decision to modify them here first.

---

## Accounts & Identity

```
RULE-001: All users start as Players upon registration. No user is born into an elevated role.

RULE-002: One Facebook account maps to exactly one Player account.
          A Facebook user ID is the unique identity key.
          Duplicate registration is rejected silently (existing account is returned).

RULE-003: Owning a **club** requires an admin-approved **club application** per club.
          Each approval mints exactly one `clubs` row; no player can self-assign ownership without that approval.
          Pending applications are subject to a **24-hour review SLA** from `updated_at` (see [`../../database/12_club_governance.md`](../../database/12_club_governance.md)).
```

---

## Roles & Permissions

```
RULE-004: Que Master is not a global role.
          It is assigned per club by that club's Club Owner.
          A Que Master has no authority outside the club they are assigned to.

RULE-005: Only active club members are eligible to be assigned as Que Master.
          If a Que Master is removed from the club, their Que Master role is revoked immediately.

RULE-006: A Club Owner cannot assign themselves as Que Master via the system.

RULE-007: Only the Club Owner can assign or revoke the Que Master role within their club.
          Que Masters cannot assign other Que Masters.
          The Club Owner can assign multiple members as Que Masters simultaneously with no cap.
          Bulk assignment (selecting multiple members at once) is supported.

RULE-008: Club Owner status in one club grants no elevated privileges in any other club.
          Roles are always scoped to their assigned club.
```

---

## Club Membership

```
RULE-009: Players can join a club via three methods only:
          - Invite Link / QR Code (if enabled by Club Owner)
          - Direct Invite (from Club Owner)
          - Request to Join (subject to Auto-Approve setting)

RULE-010: If Auto-Approve is OFF, all join requests via link/QR or manual request
          are placed in a pending queue and require Club Owner approval.

RULE-011: Direct Invites bypass the Auto-Approve setting.
          A directly invited player who accepts is immediately added as Active Member.

RULE-012: A removed member can re-request unless explicitly blocked or blacklisted by the Club Owner.
          Blocking/Blacklisting is a deliberate separate action, not automatic on removal.
```

---

## Blacklist

```
RULE-043: A blacklisted player is silently blocked from all club entry points:
          invite link, join request, and direct invite.
          They receive generic error messages and are never told they are blacklisted.

RULE-044: A player cannot be blacklisted while they are an Active Member.
          The Club Owner must remove the member first, then blacklist them.

RULE-045: Blacklist is per-club only.
          Being blacklisted in one club has no effect on the player's membership
          or access in any other club.

RULE-046: The Club Owner can remove a player from the blacklist at any time.
          Removal from the blacklist does not re-admit the player to the club —
          they must go through the standard join flow again.

RULE-047: If a player who is a Que Master is removed and blacklisted,
          their Que Master role is revoked at the moment of removal (before blacklisting).

RULE-048: All blacklist actions (add, remove) are logged with:
          - Timestamp
          - Which Club Owner performed the action
          - Optional internal note (visible to Club Owner only, never to the player)
```

---

## Club Owner Statistics

```
RULE-049: The Club Owner Statistics view is read-only — no data can be modified from within it.
          All management actions (blacklist, remove member, etc.) route to their respective flows.

RULE-050: "Consistent member" is defined as a member who attended at least the configured
          minimum number of sessions in a rolling 30-day window.
          The default minimum is 3 sessions. The Club Owner can adjust this threshold.

RULE-051: "Members via invite link" tracks the join method at the time of joining.
          This record is permanent — it does not change if the invite link is later rotated or disabled.

RULE-052: "Markup profit" in the financial summary is defined as the total markup amount
          collected above the actual court and shuttle costs across all sessions in the selected range.
          It is not accounting profit — tax, club fees, and other overhead are not accounted for.

RULE-053: Financial data in the statistics view is visible only to the Club Owner.
          Que Masters can see per-session cost totals (in the session panel) but
          cannot access the aggregate financial analytics view.
```

---

## Sessions & competitive progression

```
RULE-064: Only a Club Owner or Que Master may create a Que Session (Club Que Session or Friendly Que Session).
          Club Que Sessions require Session type: MMR (competitive) or Fun Games (no points).
          Friendly Que Sessions are always Regular (no Session type setting).

RULE-065: Friendly Que Sessions: matches are not ranked for progression; no EXP; no MMR change.
          Session standings and match history still record wins/losses when scored.
          Post-match skill dimension ratings still apply when reviews are submitted (Skill Ratings section).

RULE-066: Club Que Session — Fun Games: no EXP; no MMR change; matches and standings are recorded.

RULE-067: Club Que Session — MMR (competitive): EXP and MMR may increase or decrease per match outcome;
          matches count as ranked for progression. Asymmetric deltas for mixed-rank pairings
          are defined in product docs and are Admin-configurable (see 14_gamification.md §14.3).

RULE-068: MMR is distinct from Skill Rating (six-dimension peer assessment).
          MMR updates only per RULE-067; Skill Rating updates from reviews per Skill Ratings section.

RULE-069: A player with fewer than calibration.required_matches completed MMR matches
          is in calibration status. Calibration status is determined by comparing
          profiles.mmr_matches_played against the current platform_config threshold.

RULE-070: During calibration, all MMR deltas are multiplied by calibration.mmr_multiplier
          before being applied. The multiplied amount is recorded in mmr_transactions.amount.

RULE-071: Voided calibration matches decrement profiles.mmr_matches_played by 1.
          If the decrement drops the counter below calibration.required_matches and
          calibration_completed_at was set by the voided match, the player re-enters
          calibration (calibration_completed_at is reset to NULL).

RULE-072: The calibration multiplier and the asymmetry multiplier (mmr_asymmetry_config)
          stack multiplicatively. Both are evaluated independently per transaction.

RULE-073: The "Calibrating" indicator is visible to Que Masters, Club Owners, and the
          player themselves. It appears in the Add Match player pool, on the player's
          own profile, and on the public profile.

RULE-074: Calibration status does not affect queue priority, session eligibility,
          or any functional behavior outside of MMR delta calculation and display indicators.
```

---

## Que Sessions & Slots

```
RULE-013: Total session slots = players_per_court × number_of_courts.
          This is the maximum number of Accepted players.

RULE-014: Players who register beyond the slot limit are automatically Waitlisted.
          Session waitlist order is FIFO by default.
          Promotion may be automatic (with player confirmation — timeout TBD) or manual by host.
          Manual reorder of waitlist positions is TBD — see 08_queue_session.md §12.

RULE-015: When an Accepted player's slot opens, the first eligible Waitlisted player
          is promoted per FIFO rules and notified. See 08_queue_session.md §12.

RULE-016: A player can only have one admission state per session at a time.
          Valid states: Not Registered, Pending Approval, Accepted, Waitlisted,
          Declined, Withdrawn, Cancelled Registration, Removed, Reserved.
          States are mutually exclusive. Pending Approval does not occupy a slot.

RULE-075: Only a Club Owner or Que Master may create a Que Session.
          A regular Player cannot create a Que Session.

RULE-076: Every Que Session must remain manageable by the Club Owner and/or
          at least one assigned Que Master. All assigned Que Masters have identical
          session-management permissions. Only the Club Owner may add, remove,
          or replace assigned Que Masters — including while the session is Active.

RULE-077: A Que Session may transition to Cancelled from draft, open, or active.
          Cancelled is terminal. Refunds are handled manually outside ROTRA.
          See 08_queue_session.md §5.2.

RULE-078: Free player registration cancellation cutoff is exactly 5 hours before
          session start (default). Before cutoff: slot released, no payment obligation.
          After cutoff but before I Am In: cancellation allowed but payment obligation
          remains unless host confirms replacement/swap resolution.
          See 08_queue_session.md §14.

RULE-079: Password-protected Que Sessions must store password hashes only (never plaintext).
          Failed password attempts after the first failure are rate-limited to one attempt
          per 5 minutes, enforced by the authoritative backend.
          Password authorization is per user per session and revoked on
          registration cancel, request withdraw, or Early Exit.
          See 08_queue_session.md §10.

RULE-080: Request a Match creates a player proposal only.
          It does not create an active match or bypass Match Queue order.
          Only Que Master approval is required; approved requests follow normal queue placement.
          See 08_queue_session.md §18.

RULE-081: Every Que Session field change must create a Session Feed entry.
          Manual host announcements are also recorded in the Feed.
          See 08_queue_session.md §26.

RULE-082: There is no automatic no-show deadline that removes Accepted players
          or triggers waitlist promotion. Accepted players who have not marked I Am In
          retain their slot and payment obligation until host manual action.
          See 08_queue_session.md §15.

RULE-083: I Am In is irreversible by the Player.
          A confirmation modal is required before the state is applied.
          Corrections require Que Master or Club Owner action per audit rules.
          See 08_queue_session.md §7.1.
```

---

## Automatic Queueing

```
RULE-084: Automatic Queueing generates candidate matches only.
          It does not start a match without Que Master approval
          unless Full Automatic Queueing is enabled in session settings.
          See automatic_queueing.md §23.

RULE-085: Hard eligibility rules cannot be overridden by Automatic Queueing.
          A Player who is Playing, Exited, or Suspended cannot appear in a
          generated candidate regardless of session settings or Que Master request.

RULE-086: Repeated-match protection is advisory (soft rule).
          Automatic Queueing reduces the Match Suitability Score for repeated
          lineups but does not block approval. Que Master override is always allowed.
          See automatic_queueing.md §21.

RULE-087: A generated candidate match is invalidated when any included Player's
          eligibility changes before approval. The system must re-validate
          before queue placement and before match start.
          See automatic_queueing.md §43.

RULE-088: Voided matches do not affect Automatic Queueing form calculations
          unless an explicit canonical exception is defined.
          See automatic_queueing.md §6.3.
```

---

## Player Status & Rotation

```
RULE-017: Queue rotation eligibility statuses: "I Am Prepared" and "Waiting".
          Resting and Eating players are excluded from automatic rotation
          unless the Que Master explicitly includes them.

RULE-018: Players cannot set themselves to: Playing, Waiting, Suspended, or Exited.
          These statuses are set by the system (Playing, Waiting) or the Que Master
          (Suspended, Exited confirmation).

RULE-019: A Suspended player cannot be placed in a match by the Que Master
          without first changing their status back to I Am Prepared or Waiting.
```

---

## Match Completion

```
RULE-020: A match is Complete only when ALL of the following are true:
          - IF an umpire is assigned: the umpire has submitted the final score
          - AND: all players have submitted reviews OR the Que Master has finalized

RULE-021: Que Master finalization overrides the review wait.
          The match becomes Complete immediately on finalization regardless of review status.

RULE-022: Reviews can still be submitted after Que Master finalization within the 24-hour window.
          They update skill ratings retroactively but do not change the match's Complete status.

RULE-023: If no umpire is assigned, the score is submitted by the Que Master.
          The Que Master's score carries the same authority as the umpire score.

RULE-024: Umpire scores are final once submitted and cannot be edited by the umpire.
          Only the Que Master can override or void a score via the dispute flow.

RULE-025: A Voided match is excluded from all leaderboard rankings, statistics,
          skill rating calculations, and any EXP / MMR changes that would have applied.
          EXP and MMR already applied for that match are reversed.
          (Non-voided matches in ineligible session types never received EXP/MMR — nothing to reverse.)
```

---

## Skill Ratings

```
RULE-026: The rating submission window is exactly 24 hours after match completion.
          Ratings submitted after this window are discarded and not applied.

RULE-027: A player cannot rate themselves through the post-match flow.
          Self-assessment per dimension is set only at profile setup.

RULE-028: Self-assessment weight is reduced progressively as external ratings accumulate
          (tracked per dimension):
          0–4 external match assessments: full weight (×1)
          5–9 external match assessments: half weight (×0.5)
          10–19 external match assessments: quarter weight (×0.25)
          20+ external match assessments: excluded entirely

RULE-029: Source weights for skill rating calculation (applied uniformly across all dimensions):
          Que Master: ×3 | Umpire: ×3 | Opponent: ×2 | Partner: ×1.5 | Self: ×1

RULE-030: When sandbagging is detected, the system overrides the player's displayed
          playing level with the system-computed equivalent. The self-declared level
          is retained internally but not shown publicly.

RULE-054: Skill ratings are structured across 6 Skill Dimensions:
          Attack | Defense | Net & Touch | Precision & Control | Athleticism | Game Intelligence
          Each dimension is rated independently on a 1–5 scale.
          The overall rating is the weighted average of all dimension scores.

RULE-055: Dimensions and their sub-skills are defined in constants/skill_dimensions.
          They are managed via the Admin portal and can be modified without a code deploy.
          Admin changes to dimensions apply to future ratings only —
          historical ratings stored against a dimension ID are never retroactively recomputed.

RULE-056: A rater may skip any dimension they did not observe in the match.
          A skipped dimension is excluded from that match's contribution to the dimension average.
          It is not treated as a score of 0.

RULE-057: A dimension score on the public profile is only shown when it has
          received at least 5 external ratings. Below that threshold it displays
          as "Not enough data."
```

---

## Cost & Payments

```
RULE-031: Per-player cost formula:
          total_cost = court_cost + (shuttles_used × shuttle_cost_per_tube)
          per_player_cost = ceil(total_cost / number_of_accepted_players) + optional markup

RULE-032: Early exit requires full session payment.
          The Que Master must confirm payment settlement before the slot is released.
          There is no pro-rated early exit fee — the player owes the full session amount.

RULE-033: Each player sees their own per-player cost breakdown and payment status.
          Players cannot see other players' payment status, private markup, or profit information.
          Markup and profit are visible only to Club Owner and assigned Que Masters.
          See 08_queue_session.md §9.8, §21–22 and 09_cost_system.md §9.3.
```

---

## Real-Time & Data Integrity

```
RULE-034: The server is the authoritative source of truth for all session state.
          Client-side state is a view only. All writes go through the server.
          On reconnect, full server state is synced to the client.

RULE-035: Match records are never deleted.
          Voided records are flagged but retained for audit.
          Historical data is preserved even after a player leaves a club or the platform.

RULE-036: A player who leaves or is removed from a club retains their historical
          match records. Their name displays as "[Former Member]" on public views.
```

---

## Leaderboards & Rankings

```
RULE-037: Only scored, non-voided matches count toward leaderboard rankings.
          Voided matches are excluded entirely. Do not use "Unscored" — use Voided.

RULE-038: Leaderboard ranking criteria (in priority order):
          1. Wins (most wins = highest rank)
          2. Win rate (highest % when wins are tied)
          3. Games played (most games as final tiebreaker)

RULE-039: Umpire-submitted scores take precedence over Que Master-submitted scores
          in the event of a conflict.
```

---

## Gamification

```
RULE-040: EXP is cosmetic only. It does not affect queue priority, match eligibility,
          or any functional aspect of the session system.

RULE-041: EXP (and MMR) awarded for a voided match is retroactively reversed.

RULE-042: Ranking tiers never decrease below the tier already achieved.
          EXP reversal from voided matches does not cause tier regression.
          (Losses on MMR schedules may reduce EXP without lowering tier until below thresholds — tier floor still applies per product rules.)
```

---

## Player Comparison

```
RULE-058: Any authenticated player may initiate a comparison between any two players
          whose profiles are publicly accessible. The viewer need not be one of the
          two subjects.

RULE-059: A comparison page only surfaces data that is already publicly visible on
          each subject's individual profile. Gated stats (win rate, skill rating,
          advanced stats) that have not met their unlock threshold display as
          "Not enough data" for that subject, independently of the other subject.

RULE-060: Head-to-Head record is derived on-demand from match history.
          Only non-voided, scored (Winner ≠ Unscored) Complete matches in which
          the two subjects appeared on opposing teams are counted.

RULE-061: Partner record (same-team matches) is derived on-demand from match history.
          Only non-voided Complete matches in which both subjects appeared on the
          same team are counted.

RULE-062: The sandbagging flag is never shown in the comparison view.
          It remains restricted to Que Masters and Club Owners on individual profiles.

RULE-063: A comparison URL (/compare/{player_a_id}/{player_b_id}) is shareable
          and generates an OG card. Player A and Player B are interchangeable —
          the same pair always resolves to the same canonical URL
          (lower UUID sorted first).
```
