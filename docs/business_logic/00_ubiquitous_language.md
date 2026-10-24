# 00 — Ubiquitous Language (ROTRA Glossary)

> **Purpose:** This is the canonical vocabulary for ROTRA. Every doc, design, and code identifier should align with these terms so we never have to re-clarify what we mean. Captured from a structured terminology interview between Adrian (founder) and the AI agent on **2026-04-27**, after a sweep of `docs/`, `apps/`, and `packages/`.
>
> **Maintenance rule:** When you introduce a new term in product copy, code, or a doc, add it here first. When you find an inconsistency in older docs, **this file wins** — open a doc cleanup task rather than diverging.
>
> **Read order if you're new:** [`README.md`](./README.md) (apps overview) → this file → [`client_app/01_product_vision.md`](./client_app/01_product_vision.md).

---

## Table of contents

1. [Brand & products](#1-brand--products)
2. [Roles](#2-roles)
3. [The four "level" concepts](#3-the-four-level-concepts) — _most-confused area_
4. [Sessions](#4-sessions)
5. [Match outcomes & match anatomy](#5-match-outcomes--match-anatomy)
6. [Reviews & ratings](#6-reviews--ratings)
7. [Umpires](#7-umpires)
8. [Admin operations](#8-admin-operations)
9. [Clubs & membership](#9-clubs--membership)
10. [In-session vocabulary](#10-in-session-vocabulary)
11. [Leaderboards & scopes](#11-leaderboards--scopes)
12. [Authentication, identity & onboarding](#12-authentication-identity--onboarding)
13. [Skill rating internals & sandbagging](#13-skill-rating-internals--sandbagging)
14. [MMR calibration](#14-mmr-calibration)
15. [Payments & cost](#15-payments--cost)
16. [Notifications, sharing & realtime](#16-notifications-sharing--realtime)
17. [UI / view vocabulary](#17-ui--view-vocabulary)
18. [Tech stack & infrastructure](#18-tech-stack--infrastructure)
19. [Brand assets & mascots](#19-brand-assets--mascots)
20. [Database ↔ product term mapping](#20-database--product-term-mapping)
21. [Phasing & MVP](#21-phasing--mvp)
22. [Deprecated / retired terms](#22-deprecated--retired-terms)
23. [Open / TBD](#23-open--tbd)

---

## 1. Brand & products

| Term             | Definition                                                                                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ROTRA**        | The product / platform name. Coined brand word — no literal meaning, no acronym. **Always all-caps** in every surface: UI, wordmark, logo, docs, code comments, prose. The title-case "Rotra" is **deprecated** wherever it currently appears; sweep and replace. |
| **Tagline**      | _"Run the game."_                                                                                                                                                                                                                                                 |
| **Que Master**   | The session-running role. Two words. **"Que"** (not "Queue") is the deliberate brand spelling and is reused as a prefix elsewhere (Que Session, Que Schedule). The variant "Queue Master" is a typo whenever it appears.                                          |
| **Que Session**  | The umbrella term for any badminton session in ROTRA (see [§4](#4-sessions)).                                                                                                                                                                                     |
| **Que Schedule** | **Synonym of Que Session.** Either word is fine in copy and code; pick the one that reads better in context. Both terms refer to the same entity (`queue_sessions` row).                                                                                          |

**Lowercase `rotra` exception.** npm package names (`@rotra/db`, `@rotra/client`, `@rotra/admin`, `@rotra/umpire`, `@rotra/landing`, `@rotra/config`), filesystem paths (`apps/`, `packages/`), URL slugs, and DB identifiers stay lowercase — those are technical conventions, not brand text. Anywhere a human reads the brand name it must be **ROTRA**.

**Code casing.** Not enforced. `queMaster`, `QueMaster`, `que_master`, and `que-master` are all acceptable in their respective contexts (TS identifiers, file paths, DB columns, URL slugs). Pick the casing that matches the surrounding convention.

**Apps.** Refer to apps by either their audience name or package path; both are acceptable. Style: `Player app (apps/client)`.

| Audience name    | Package path                      | Port | Description                                                        |
| ---------------- | --------------------------------- | ---- | ------------------------------------------------------------------ |
| **Landing page** | `@rotra/landing` (`apps/landing`) | 3003 | Public coming-soon / waitlist signup                               |
| **Player app**   | `@rotra/client` (`apps/client`)   | 3000 | Player-facing app (also where Club Owners and Que Masters operate) |
| **Admin app**    | `@rotra/admin` (`apps/admin`)     | 3001 | Internal operations dashboard                                      |
| **Umpire app**   | `@rotra/umpire` (`apps/umpire`)   | 3002 | Live scoring PWA                                                   |

---

## 2. Roles

All users register as **Players**. Elevated roles are additive and **per-club** unless stated otherwise.

| Role           | Scope                                     | How granted                                                                                                               |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Player**     | Platform-wide (default for every account) | Facebook OAuth signup, or Email Invitation followed by Facebook link (see [§12](#12-authentication-identity--onboarding)) |
| **Club Owner** | Per club                                  | Submit a `club_application`; Admin approval inserts the `clubs` row with the player as `owner_id`                         |
| **Que Master** | Per club (assigned by that club's Owner)  | Club Owner promotes any active member; multiple Que Masters per club allowed                                              |
| **Umpire**     | Per match                                 | Assigned by Que Master per-match (see [§7](#7-umpires))                                                                   |
| **Admin**      | Platform-wide                             | Internal team only; uses the Admin app; email + MFA login                                                                 |

A Club Owner of Club A holds **no elevated privileges** in Club B unless separately granted. Same for Que Master.

---

## 3. The four "level" concepts

> **Adrian's mental model:** these are four genuinely different things. Don't conflate them in product copy or code.

| Term              | What it is                                                                                                                                                                                                                                                       | Visibility                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Playing level** | Self-declared bucket: `Beginner` / `Intermediate` / `Advanced`. Cosmetic. Never affects matchmaking or progression.                                                                                                                                              | **Self-only** — visible on the player's own profile; not shown to other users.                                                                                                      |
| **Skill Rating**  | Peer-computed 1.0–5.0 score across **6 skill dimensions** (see [§13](#13-skill-rating-internals--sandbagging)). Updated by post-match reviews. Applies to **all** session types.                                                                                 | **Always displayed.** Starts seeded by self-assessment, then shifts toward external ratings as they accumulate (self-assessment weight phases out after 5+ external per dimension). |
| **MMR**           | Numeric competitive ladder rating. Default starting value **1000**, floor **0**. Moves **only** on **Club Que Sessions** with **Session type = MMR**. The internal absolute MMR is private; players see only the **MMR Gain / MMR Loss** delta after each match. | **Delta visible to player** post-match. **Absolute MMR visible to Admin only.**                                                                                                     |
| **Tier**          | Cosmetic badge derived from accumulated **EXP**. Progression: **Cadet → Warrior → Elite → Master → Titan → Apex / Apex Predator** (Apex is position-based on the global leaderboard, not EXP-based).                                                             | Public — shown on profile, leaderboards, and the Player Pool.                                                                                                                       |

### Related "rank" vocabulary

| Term                                            | Meaning                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rank**                                        | An MMR bracket / matchmaking rank. Used as a **filter dimension** on leaderboards (`rank`, `city`, `country`). Not a leaderboard position number. |
| **Position** / **Standing**                     | A numeric place on a leaderboard (e.g. "position #3 in the club"). Use this — _not_ "rank" — when referring to leaderboard order.                 |
| **Competitive** / **Ranked** / **MMR-eligible** | **Synonyms** in ROTRA — all three mean "Club Que Session with Session type = MMR." Pick one for any given doc and stay consistent.                |
| **MMR Gain / MMR Loss**                         | The post-match MMR delta shown to the player (signed gain on win, signed loss on loss).                                                           |

### EXP

**EXP** (experience points) is the gamification currency that determines Tier. Match-linked EXP is awarded **only** on **Club Que Session — MMR**. Profile-completion and one-time EXP rewards are session-type-agnostic. Voided matches reverse all EXP and MMR attributed to that match. See [`client_app/14_gamification.md`](./client_app/14_gamification.md).

---

## 4. Sessions

A **Que Session** (synonym: **Que Schedule**) is the core operational unit. Two variants by **origin** (who created it):

| Origin                   | Created by                            | Session type options                                             | EXP / MMR                      |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| **Club Que Session**     | Que Master or Club Owner of that club | **Required:** `MMR` (competitive) **or** `Fun Games` (no points) | EXP and MMR move only on `MMR` |
| **Friendly Que Session** | Que Master or Club Owner of that club | Always **Regular** (no setting exposed)                          | **Never** — no EXP, no MMR     |

> **Creation rule (2026-06):** Only a **Club Owner** or **Que Master** may create any Que Session. A regular **Player** cannot create a Que Session. See [`client_app/08_queue_session.md`](./client_app/08_queue_session.md) §3.

**"Que Session" used alone** is valid and means "either variant" (umbrella). Use the explicit prefix when the origin matters.

### Session type (Club Que Session only)

`Session type` is **only** a Club Que Session setting. Friendly Que Sessions don't have one — they're always Regular. Values for Club Que Sessions:

- **`MMR`** — competitive; EXP and MMR move; counts as ranked.
- **`Fun Games`** — non-competitive; matches and standings are recorded; **no EXP, no MMR**.

Skill-dimension ratings still apply across **all** session variants when matches complete — only EXP and MMR are gated.

### Friendly mode = Regular

Friendly Que Sessions run in a single, implicit mode called **Regular**. **Don't say "Fun Games" for a Friendly** — `Fun Games` is reserved for Club Que Sessions and means something specific (a recorded but non-competitive Club session). The two modes are not interchangeable:

| Where you are                    | What the mode is called                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| **Club Que Session — MMR**       | Competitive. EXP + MMR move.                                                       |
| **Club Que Session — Fun Games** | Recorded, no points. Distinct from a Friendly.                                     |
| **Friendly Que Session**         | **Regular**. No `Session type` setting. No EXP. No MMR. Distinct from "Fun Games". |

> ⚠️ **DB note:** The Postgres enum is `schedule_type_enum` (values `mmr` / `fun_games`). It only applies to Club Que Sessions. See [§20](#20-database--product-term-mapping) for the full DB-vs-product mapping.

### Session host

**Session host** = whoever started a given Que Session. Resolves to:

- A **Club Owner** or **Que Master** for a Club Que Session.
- The creating **Player** for a Friendly Que Session.

When multiple Que Masters co-manage a Club Que Session, all of them act as host with last-write-wins conflict resolution.

### Session lifecycle

```text
Draft → Open → Active → Closed → Completed
                ↘
              Cancelled   (terminal; session will not proceed)
```

`Cancelled` may also be reached from `Draft` or `Open`. See [`client_app/08_queue_session.md`](./client_app/08_queue_session.md) §5 for state-by-state actor permissions, triggers, and immutability rules.

### Schedule context (timing classification)

Separate from **session origin** and **session type**:

| Classification | Meaning |
| -------------- | ------- |
| **Regular club schedule** | A recurring or planned club session tied to the club's normal programming |
| **Quick session** | A one-time or ad-hoc session created outside a fixed recurring schedule |

This is a display and organization concept — not a substitute for session origin or session type.

### Session visibility

Per-session setting controlling who can find it:

- **Club Members Only** — visible only to active members of the host club.
- **Open via Link** — accessible by anyone with the share URL / QR code (still respects slot limits).

### Match format & score limit

- **Match format** = `Best of 1` / `Best of 3` (the set count needed to win a match).
- **Score limit** = the points target per set (default `21`).

---

## 5. Match outcomes & match anatomy

### Match anatomy

| Term                | Meaning                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Team A / Team B** | Canonical labels for the two sides of any match. Used in DB (`team_enum`), umpire UI, and product copy. |
| **Set**             | One race to the score limit. A Best-of-3 match has up to 3 sets.                                        |
| **Set tracker**     | Umpire-UI element showing current set score (e.g. `1–0`); advances automatically on set win.            |
| **Court number**    | Integer assignment (`Court 1`, `Court 2`, …) within a session.                                          |

### Match outcome lifecycle

A match progresses through these states:

```text
Active  →  Finalized  →  Completed
                ↘
                  Voided   (terminal; reverses EXP/MMR)
```

| State         | Meaning                                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Active**    | The match is in progress (or queued). No score yet.                                                                                                                                                                                                                                              |
| **Finalized** | **The match is physically over and the score is locked in, but not all participants have submitted their Rate-and-Review yet.** Umpire has submitted; the umpire's job is done. EXP and MMR can already settle (they don't depend on player reviews).                                            |
| **Completed** | **All participants have submitted their Rate-and-Review** (or the review window has closed). The match is fully closed and contributes to Skill Rating updates.                                                                                                                                  |
| **Voided**    | Terminal outcome. The match is erased: any EXP and MMR attributed to it are reversed, `mmr_matches_played` is decremented if the match was during calibration (see [§14](#14-mmr-calibration)), the row is excluded from leaderboards. **Use "Voided" — never "Unscored"** (deprecated synonym). |

**Why two pre-terminal states?** A match becomes Finalized the moment scoring is done so the next match can start and points can settle. It only becomes Completed once the social side (Rate-and-Review) is complete — that gates Skill Rating updates, which depend on reviews.

| Term             | Meaning                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Finalize**     | The verb. The umpire (or Que Master) finalizes a match by submitting the final score. Produces the Finalized state.                |
| **Complete**     | Implicit transition. Triggered automatically when the last expected review lands or the review window expires. Produces Completed. |
| **Void**         | The verb. Que Master action that produces the Voided state.                                                                        |
| **Winning team** | The result label on a Finalized or Completed match (`team_a` / `team_b`). On a Voided match, no winning team is recorded.          |

### Substitution (in-match player replacement)

When a player needs to exit mid-match, the Que Master can run a **Substitution** instead of voiding. The substitution flow records different outcomes depending on Session type:

| Session type               | Behavior                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Friendly / Fun Games**   | Match continues with the **substitute** in place of the **substituted player**. Both still receive Rate-and-Review feedback. The substitute is recorded with the team's actual win/loss outcome. **The substituted player is automatically recorded as a loss** regardless of the team's result. No EXP or MMR effect (those modes don't move points). |
| **Club Que Session — MMR** | Substitution is **not allowed**. The match is **automatically Voided**, the session moves on to the next match in the Match Queue. No MMR delta, no EXP delta, no Rate-and-Review.                                                                                                                                                                     |

**Vocabulary:**

| Term                   | Meaning                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Substitution**       | The action of replacing a mid-match player. Distinct from "Walkover" (which is not used here). |
| **Substitute**         | The player coming in.                                                                          |
| **Substituted player** | The player coming out. In Friendly / Fun Games, auto-recorded as a loss.                       |

---

## 6. Reviews & ratings

> **Critical:** _Rating_ and _Review_ are **two different things.** They live in the same form ("Rate and Review"), but they are not synonyms.

| Term                | Meaning                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rating**          | The **numeric 1–5 stars** picked across the 6 skill dimensions. Quantitative. One Rating value per dimension per submission. This is what feeds into the Skill Rating computation.                                            |
| **Review**          | The **written-text comment** in a textarea. Qualitative. Optional. Visible to the rated player; in Player→Player submissions the author identity is hidden (see "Anonymous review" below).                                    |
| **Rate and Review** | The **canonical CTA / form name** that bundles both above. Always written this way in product copy: capitalised "R" on each, joined by "and" (not "&"). Use this when referring to the post-match feedback action as a whole. |
| **Submission**      | The persisted record of one player's Rate-and-Review for one match (DB row in `match_reviews` plus its `match_review_ratings`). Use "submission" sparingly — prefer "Rate and Review" in product copy.                        |

### Sub-concepts

| Term                                                        | Meaning                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anonymous review**                                        | Player → Player **written Reviews** are anonymous: the reviewed player sees the text but not the author. **Ratings (the numeric stars) are not anonymous to the system** (used for weighting), but identities aren't shown to the rated player either.              |
| **Que Master Rate-and-Review** / **Umpire Rate-and-Review** | Non-anonymous (the Que Master and authenticated Umpire are identified). Their Ratings carry higher weight in the Skill Rating calculation (see [§13](#13-skill-rating-internals--sandbagging)).                                                                     |
| **Review window**                                           | The 24-hour period after a match is **Finalized** during which players can submit their Rate-and-Review. After the window closes, missing submissions are discarded and the match auto-transitions to Completed.                                                    |
| **Profanity filter**                                        | Automated content moderation step that runs **on the Review text** (not on Ratings) **before** a Rate-and-Review form can be submitted. Submissions failing the filter are rejected client- and server-side. Distinct from **Complaints** (user-generated reports). |

---

## 7. Umpires

**Umpire** is the role assigned to score a single match. Two **orthogonal** axes:

### Axis A — Assignment timing

- **Preset Umpire** — assigned ahead of time for the whole Que Session (e.g. "Maria umpires court 2 all night").
- **On-the-fly Umpire** — assigned per match by the Que Master from whoever's available.

### Axis B — Authentication

- **Authenticated Umpire** (also called **Assigned Umpire** when set up via the in-app picker) — a logged-in ROTRA user. **Can also rate players** post-match.
- **Quick Umpire** _(synonym: **Guest Umpire**)_ — opens the match via a one-time token / URL / QR generated by the Que Master. **Not logged in.** Score-only — **cannot rate players**.

The capability gate (post-match player rating) is determined by **authentication**, not by assignment timing.

### Umpire app

The standalone PWA at `apps/umpire`. Token-gated; anyone with a valid token can open the **Umpire View** (the mobile scoring interface). No login required to score; login required to also rate players.

---

## 8. Admin operations

| Term                    | Meaning                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Approvals queue**     | The Admin app queue containing **Club Applications** + **Demotion Requests**. Complaints do **not** live here.                                                                   |
| **Club Application**    | A player's request to create a new club. Approval inserts the `clubs` row and assigns the applicant as `owner_id`. 24h auto-reject SLA on stale pending rows.                    |
| **Demotion Request**    | An admin action triggered by a member **complaint** about a Club Owner. Admin reviews and may remove that owner's status for the affected club.                                  |
| **Complaint**           | A user-submitted report (e.g. "this player / owner is misbehaving"). Distinct from `moderation_flags`. May trigger a Demotion Request flow.                                      |
| **Moderation**          | Automated content filtering — the profanity filter that blocks bad words **before** a review form can be submitted.                                                              |
| **moderation_flags**    | DB-level records of the auto-moderation hits. Distinct from user complaints.                                                                                                     |
| **Kill switch**         | The canonical ROTRA term for a feature flag used as a quick boolean off-switch (e.g. disable a feature without a deploy). The Kill Switches panel in the Admin app houses these. |
| **Feature flag**        | Engineering-side synonym for a Kill switch. Use "Kill switch" in product copy.                                                                                                   |
| **Admin Notifications** | A separate notification queue for admin-facing alerts (e.g. a new Demotion Request opened). DB table `admin_notifications`, distinct from player `notifications`.                |
| **Admin Action Log**    | Append-only audit log of admin actions (`admin_action_log`).                                                                                                                     |

---

## 9. Clubs & membership

### Club state

| State        | Meaning                                      | Reversible?                             |
| ------------ | -------------------------------------------- | --------------------------------------- |
| **Active**   | Accepting members and sessions               | n/a                                     |
| **Paused**   | Visible but no new sessions or join requests | **Yes** — Club Owner can resume         |
| **Archived** | Read-only; history retained, no new activity | **Effectively no** — treat as permanent |

Both **Club Owner** and **Admin** can transition state. Admin transitions happen via demotion / transfer / archive flows. Hard delete is never used.

### Member state

Tracked as **distinct states** with provenance:

| State             | Meaning                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| **Pending**       | Join request awaiting Club Owner review                                                             |
| **Active member** | Confirmed in the club; can attend sessions                                                          |
| **Removed**       | Involuntary exit — kicked by the Club Owner                                                         |
| **Left**          | Voluntary exit — player left on their own                                                           |
| **Blacklisted**   | Permanently silently blocked. Player must be **Removed first** before being added to the blacklist. |

### Join methods

The three ways a Player can become a member of a club:

| Method               | Description                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Invite Link / QR** | One active link per club generated by the Owner. Invalid when disabled or rotated.                                            |
| **Direct Invite**    | Owner searches for a player and sends an in-app invite. Bypasses the join-request queue.                                      |
| **Join Request**     | Player initiates from search or a shared link; placed in the Owner's review queue (or auto-accepted if `Auto-Approve` is on). |

### Auto-Approve

Club setting (`clubs.auto_approve`). When **ON**, join requests via Invite Link / QR or Join Request method are auto-accepted as Active members. Direct Invites bypass this regardless. Default: **OFF**.

### Blacklist semantics

- Blacklisted players are **silently blocked** at every entry point (Invite Link, Join Request, Direct Invite). They see **only a generic error**, never an explicit "you're blacklisted" message.
- Blacklist is **per-club only** — no cross-club effect.
- Removing someone from the blacklist does **not** re-add them to the club.

### Membership audit

`club_membership_audit_log` records every membership state transition (join, leave, kick, blacklist add/remove) with `performed_by` and timestamp.

---

## 10. In-session vocabulary

### Two parallel state machines

A player in an active Que Session is described by **two independent states** at once:

**Admission state** — _"Am I in this session at all?"_ (distinct from attendance / player status)

| State                      | Meaning                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| **Not Registered**         | No join request or registration exists for this player                  |
| **Pending Approval**       | Join request submitted; awaiting Club Owner or Que Master decision      |
| **Accepted**               | Within capacity; confirmed seat (occupies a slot)                       |
| **Waitlisted**             | Over capacity or promoted to waitlist; FIFO promotion when a slot opens |
| **Declined**               | Join request rejected by host                                           |
| **Withdrawn**              | Player withdrew a pending request                                       |
| **Cancelled Registration** | Player cancelled their accepted registration                            |
| **Removed**                | Host removed the player from the session                                |
| **Reserved**               | Slot held manually by the Que Master (legacy / host-held slot)          |

**Player status** (a.k.a. **player session status**) — _"What am I doing right now?"_

`Not Arrived` → `I Am In` → `I Am Prepared` → (`Playing` / `Waiting` / `Resting` / `Eating` / `Suspended` / `Exited`)

Only `I Am Prepared`, `Waiting`, and (optionally) `Resting` are **rotation-eligible**.

> ⚠️ **Waitlist disambiguation:** "Waitlist" inside a Que Session (over-capacity admission queue) is **not** the same as **Waitlist Signup** on the landing page (pre-launch email capture, table `waitlist_signups`). Always say "session waitlist" vs "marketing waitlist" if there's any ambiguity.

### Other in-session terms

| Term                       | Definition                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slot**                   | One unit of capacity = one Accepted seat.                                                                                                                                                                                       |
| **Capacity**               | The total count of slots: `players_per_court × number_of_courts`.                                                                                                                                                               |
| **Match Queue**            | The ordered list of upcoming matches inside a Que Session. Canonical name (avoids confusion with "Que Session" the umbrella term). May be informally shortened to "the queue" inside session context.                           |
| **Player Pool**            | The set of players currently **rotation-eligible** — i.e. status `I Am Prepared`, `Waiting`, or (Que Master's discretion) `Resting`. The Que Master picks from the Pool when building a new match.                              |
| **Rotation**               | Used **both** as a noun and adjective: (a) the act of cycling players through matches by waiting-time fairness, and (b) "rotation-eligible" as a status flag describing whether a player can currently be picked from the Pool. |
| **Smart Monitoring**       | The system's match-end-prediction signal triggered when the live score crosses a configurable threshold (default 90% of win condition).                                                                                         |
| **"Match nearing end"**    | The notification fired by Smart Monitoring at the threshold (default 90%).                                                                                                                                                      |
| **"Match point"**          | Secondary alert at one point from match-completing score.                                                                                                                                                                       |
| **Average match duration** | Rolling average of completed match durations in the current session, used to estimate wait times.                                                                                                                               |
| **Estimated wait time**    | Display estimate when available; calculation method **TBD** for Que Session Lobby (see [`client_app/08_queue_session.md`](./client_app/08_queue_session.md)).                                                                    |
| **Lobby**                  | The main Player-facing Que Session detail view before and during a session. Before **Active**, it is the primary entry point. When **Active**, it remains available as the **Overview** tab. See [`client_app/08_queue_session.md`](./client_app/08_queue_session.md) §8. |
| **Session Feed**           | The per-session activity stream visible from the Lobby and Active Session Overview. Records field changes, system events, and manual host announcements. See [`client_app/08_queue_session.md`](./client_app/08_queue_session.md) §25. |
| **Request a Match**        | A Player-facing action that proposes a lineup to the Que Master. Does not create an active match or bypass the Match Queue. See [`client_app/08_queue_session.md`](./client_app/08_queue_session.md) §17. |
| **Early Exit**             | The required workflow for leaving a session after marking **I Am In**. Replaces ordinary registration cancellation. |
| **I Am In**                | Player self-declaration of physical arrival at the venue. Irreversible by the Player; requires confirmation modal. |
| **I Am Prepared**          | Player self-declaration of readiness for Match Queue rotation after **I Am In**. |
| **Automatic Queueing**     | ROTRA's intelligent matchmaking engine. Generates **candidate matches** for Que Master review or automatic Match Queue placement. Distinct from Manual Queueing and from sorting by rank or wait time alone. See [`client_app/automatic_queueing.md`](./client_app/automatic_queueing.md). |
| **Manual Queueing**        | Que Master builds or modifies matches without Automatic Queueing. Always available. |
| **Matchmaking mode**       | One of: Fun / Relaxed, Normal / Balanced, Training Style, Overload Training. Selected per session or overridden for the next match. |
| **Candidate match**        | A generated lineup with teams, scores, warnings, and explanation — not yet approved or in the Match Queue. Synonym: **Proposed match**. |
| **Effective Strength**     | Estimated Player strength **for the next match**. Combines base rating with temporary adjustments. Not permanent MMR, Skill Rating, or Tier. |
| **Rating Confidence**      | How reliable ROTRA considers a Player's strength estimate. Not a strength bonus. |
| **Challenge Index**        | Temporary target (0–10) for how difficult the Player's next match should be. Not Player skill. |
| **Queue Priority**         | How urgently a Player needs a match. Separate from skill, strength, EXP, and Tier. |
| **Fatigue and Readiness**  | Whether a Player should be selected for the next match now. |
| **Match Suitability Score**| Overall quality score (0–100) for a candidate under the selected matchmaking mode. |
| **Carrier**                | The stronger Player in a Training Style or Overload Training matchup. |
| **Development Player**     | The lower-ranked partner in a Training Style matchup. |
| **Carry burden**           | How often a Player has been expected to carry weaker partners. |
| **Repeated-match warning** | Advisory alert when a lineup repeats recent partnerships or opponents. Does not block approval. |
| **Predicted win probability** | Estimated chance each team wins (e.g. 52% / 48%). |
| **Current Session Form**   | Performance adjustment within the active Que Session. |
| **Recent Form**            | Performance adjustment across recent valid matches (expected vs actual). |
| **Match Difficulty History** | Per-Player record of how difficult recent matches were for that individual. |

### Temporary session skill eligibility (transitional)

Until the dedicated ROTRA tiers / MMR / Skill Rating eligibility module ships, Que Sessions use **temporary assigned skill levels** for join gating:

`Beginner Low`, `Beginner Mid`, `Beginner High`, `Intermediate Low`, `Intermediate Mid`, `Intermediate High`, `Advanced Low`, `Advanced Mid`, `Advanced High`, `Professional`

| Rule | Detail |
| ---- | ------ |
| Assignment | Assigned by a Que Master — not self-declared by the Player for this feature |
| Allowed levels | Host may select any combination of levels for a session (not limited to one level or a single range) |
| Ineligible players | May still submit a request but require manual Que Master approval |

**Do not** call these values MMR, Skill Rating, ROTRA Tier, or competitive rank. They are temporary session eligibility classifications. See [`client_app/08_queue_session.md`](./client_app/08_queue_session.md) §13.

---

## 11. Leaderboards & scopes

Leaderboards have a **scope** and a **dimension**.

| Scope                       | Default dimension | Filter dimensions                                                    |
| --------------------------- | ----------------- | -------------------------------------------------------------------- |
| **Session**                 | Wins              | —                                                                    |
| **Club**                    | Cumulative wins   | `rank` (MMR bracket), `city`, `country` (configurable by Club Owner) |
| **City / Country / Global** | MMR               | `rank`                                                               |

**"Position"** / **"Standing"** = a player's place number within a leaderboard. Do **not** call this "rank" — `rank` is reserved for the MMR-bracket filter dimension.

**Global leaderboard minimum match threshold** — `thresholds.global_leaderboard_min_matches` (default 20) gates new players from appearing globally until they have enough data.

---

## 12. Authentication, identity & onboarding

### Identity model

| Term           | Meaning                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`profiles`** | The canonical user table. Extends Supabase `auth.users`. Every ROTRA-specific column lives here. References to "user" / "account" / "player" in product copy all map to `profiles`. |
| **Player**     | Product-facing word for a profile.                                                                                                                                                  |
| **Account**    | The combined auth + profile entity. Use sparingly in product copy; prefer "Player" or "profile".                                                                                    |

### Authentication paths

There are **two** registration paths:

| Path                 | How it works                                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Facebook Login**   | Primary path. OAuth 2.0 via Supabase Auth. One Facebook account = one Player account (deduped server-side by `facebook_id`). Profile name + avatar seeded from Facebook; editable post-signup.                                                                   |
| **Email Invitation** | An admin / existing user sends an invite token to an email. Recipient opens the link, links their Facebook account, and Supabase verifies the linked email matches. `email_invitations` table tracks lifecycle (`pending` / `accepted` / `expired` / `revoked`). |

Admin app login uses **email + MFA** (separate from player auth).

### Verified status

`profiles.is_verified` is a **generated column** — true only when **all three** are true:

1. `facebook_id IS NOT NULL` — Facebook is linked
2. `email_verified = true` — email confirmed
3. `onboarding_completed = true` — wizard finished

A profile is unverified by default until all three conditions are met.

### Onboarding wizard

A **mandatory 9-step linear wizard** at `/onboarding`:

| Step | Collects                                           |
| ---- | -------------------------------------------------- |
| 0    | Welcome / Greeting (no input)                      |
| 1    | Display name                                       |
| 2    | Phone number                                       |
| 3    | Age + Playing-since year                           |
| 4    | Self-declared Playing level                        |
| 5    | Format preference (`Singles` / `Doubles` / `Both`) |
| 6    | Court position (`Front` / `Back` / `Both`)         |
| 7    | Play mode (`Competitive` / `Social` / `Both`)      |
| 8    | Tournament wins last year (`none` / `1–3` / `4+`)  |

**Cannot be dismissed, skipped, or navigated away from.** Server-side guard redirects to `/onboarding` on every authenticated request until `profiles.onboarding_completed = true`.

The **profile completion bonus** (one-time +20 EXP) is tracked separately via `profiles.profile_completed_bonus_claimed`.

### Tokens

| Term                                | Meaning                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Session token**                   | OAuth 2.0 session for a logged-in Player. Refresh handled transparently.                                                |
| **One-time token** _(Quick Umpire)_ | Single-match scoring token generated by Que Master. Expires when the match is submitted or the session ends. Revocable. |
| **Invite token**                    | Email-invitation token. Has expiry, `pending` / `accepted` / `expired` / `revoked` lifecycle.                           |
| **Invite link / QR**                | Per-club share artifact for joining the club (not the same as a session-specific QR).                                   |
| **Session QR**                      | Session-specific share artifact for the **App / QR** join method on a Que Session.                                      |

---

## 13. Skill rating internals & sandbagging

### The 6 Skill Dimensions

| Dimension               | Sub-skills                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Attack**              | Smash, Half Smash, Jump Smash, Cross Smash, Drive, Cross Drive, Backhand Smash |
| **Defense**             | Clear, Backhand, Backhand Clear                                                |
| **Net & Touch**         | Net Play, Setting, Push, Drop, Backhand Drop                                   |
| **Precision & Control** | Slice, Backhand Slice, Cross Drop, Placing, Deception                          |
| **Athleticism**         | Footwork, Anticipation                                                         |
| **Game Intelligence**   | Critical Thinking, Teamwork, Deception (tactical), Placing (tactical)          |

Stored in `skill_dimensions` (admin-editable; no code deploy needed). Sub-skills live in `skill_dimensions.sub_skills` JSONB.

### Self-assessment

`player_self_assessments` holds the player's own 1–5 score per dimension, set during the onboarding-equivalent profile setup and editable later. It seeds the displayed Skill Rating until at least 5 external ratings accumulate per dimension, after which self-assessment weight phases out.

### Rating weights

| Source                        | Weight | Notes                                      |
| ----------------------------- | ------ | ------------------------------------------ |
| Que Master review             | ×3     | Highest                                    |
| Umpire review (authenticated) | ×3     | Highest                                    |
| Opponent review               | ×2     |                                            |
| Partner review                | ×1.5   |                                            |
| Self-assessment               | ×1     | Phases out after 5+ external per dimension |

### Sandbagging / Anti-sandbagging

**Sandbagging** = a player deliberately under-rating themselves (or being under-rated by collusion) to gain an unfair queue, bracket, or matchmaking advantage.

The system raises a `sandbagging_flags` row when detection signals fire (e.g. external ratings consistently higher than self-assessment, win rate against higher-rated opponents, yo-yo rating patterns). Flagged players have their displayed level overridden by the system-computed value, and Que Masters / Club Owners see a flag indicator on the player card.

---

## 14. MMR calibration

### Calibration

The first **N** completed MMR matches (default 10, configurable via `calibration.required_matches`) where MMR deltas are multiplied by `calibration.mmr_multiplier` (default 2.0). Designed so a new player's MMR converges quickly toward their true skill level.

| Term                           | Meaning                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default starting MMR**       | `1000` for every new Player                                                                                                                                 |
| **MMR floor**                  | `0` — MMR is never negative; deltas are capped to prevent crossing the floor                                                                                |
| **Calibrating**                | Status flag for a player whose `mmr_matches_played < calibration.required_matches`. Indicator visible to Que Master, Club Owner, and the player.            |
| **`mmr_matches_played`**       | Cached counter on `profiles`; incremented on completed scored MMR match, decremented on void.                                                               |
| **`calibration_completed_at`** | Timestamp set when threshold is reached. Reset to `NULL` if a void drops the counter back below threshold and that void was the threshold-completing match. |
| **`is_calibration` flag**      | Per-row marker on `mmr_transactions` indicating that delta was amplified.                                                                                   |
| **K-factor**                   | Admin-configurable parameter in the base MMR formula (separate from calibration multiplier).                                                                |
| **Effective delta**            | `base_delta × calibration_multiplier × asymmetry_multiplier` — the actual MMR change applied.                                                               |

**"Calibrating" badge** appears in:

- Add Match player pool (next to Tier badge): "**Calibrating** · N / 10 matches"
- Player's own profile MMR section
- Player's public profile next to the MMR value (provides context that the value is provisional)

A player with `mmr_matches_played = 0` shows "**New — 0 / 10**" instead, distinguishing them from mid-calibration.

### Asymmetric MMR

On MMR sessions when teammates span a large skill gap (`mmr_gap_threshold` exceeded), a separate `asymmetry_multiplier` modifies the delta — lower-rated players gain less / lose more when paired with much higher-rated partners; higher-rated players gain more / lose less in that pairing. Stacks **multiplicatively** with calibration.

---

## 15. Payments & cost

### Per-player cost calculation

```text
total_cost      = court_cost + (shuttles_used × shuttle_cost_per_tube)
per_player_cost = ceil(total_cost / accepted_players) + markup_amount
```

| Term                        | Meaning                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Court cost**              | Total rental across all reserved courts.                                                                                                      |
| **Shuttle cost (per tube)** | Cost of one tube; multiplied by tubes used.                                                                                                   |
| **Markup**                  | Optional flat or percentage amount added per player on top of actual cost. The "markup profit" is what's tracked in the Club Statistics view. |
| **Per-player cost**         | The amount each Accepted player owes; computed by the formula above.                                                                          |

### Payment statuses

Tracked per accepted player by the Que Master:

| Status      | Meaning                                       |
| ----------- | --------------------------------------------- |
| **Unpaid**  | Default on joining a session                  |
| **Paid**    | Que Master has confirmed full payment         |
| **Partial** | Player has paid less than the per-player cost |

**Settle** = the verb used in product copy to mean "the player completes payment to the Que Master's satisfaction." Used in early-exit flow and end-of-session reminders.

---

## 16. Notifications, sharing & realtime

### Notification surfaces

| Surface                 | Meaning                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| **Notification Center** | Player-facing inbox view in the Player app. Backed by `notifications`.                                    |
| **Admin Notifications** | Admin-facing inbox in the Admin app. Backed by `admin_notifications`. Distinct from player notifications. |
| **Toast**               | Transient in-app surface for immediate feedback (e.g. "Score saved."). Not persisted.                     |

### Sharing artifacts

| Artifact            | Meaning                                                      |
| ------------------- | ------------------------------------------------------------ |
| **Match card**      | Image-renderable share unit showing match score and players. |
| **Snapshot**        | Static post-session leaderboard image.                       |
| **Open Graph card** | Auto-generated link preview for social-media sharing.        |

### Realtime

| Term                      | Meaning                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Realtime channel**      | A Supabase Realtime subscription. `queue_sessions`, `session_registrations`, and `matches` are published. |
| **Long-polling fallback** | What clients drop to when a websocket cannot stay connected.                                              |
| **Last-write-wins**       | Conflict resolution policy when multiple Que Masters edit the same Que Session.                           |
| **Last-known state**      | What's preserved client-side during a disconnect; the offline banner uses this until reconnection.        |

---

## 17. UI / view vocabulary

Naming patterns used for screen / view types:

| Pattern       | Examples                        | Meaning                                                                       |
| ------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| **Hub**       | _Club Owner Hub_, _Clubs Hub_   | A landing/aggregator screen for a role or category.                           |
| **Console**   | _Que Master Console_            | The control surface for a role mid-session.                                   |
| **Center**    | _Notification Center_           | A collected inbox for messages of a kind.                                     |
| **Discovery** | _Club Discovery_                | A search/explore surface for finding things.                                  |
| **Ledger**    | _EXP Ledger_                    | An append-only transaction log (player can review their history).             |
| **List**      | _Session List_                  | A simple enumeration view.                                                    |
| **Lobby**     | _Que Session Lobby_             | Main Player-facing Que Session detail view; becomes **Overview** tab when Active. |
| **Profile**   | _Own Profile_, _Player Profile_ | "Own" = first-person view, "Player" = third-person public view of any player. |
| **Setup**     | _Session Setup_                 | A configuration / wizard surface.                                             |
| **Approvals** | _Approvals (Admin)_             | Admin queue for pending approvals.                                            |
| **Audit Log** | _Audit Log (Admin)_             | Read-only history of admin actions.                                           |
| **Dashboard** | _Dashboard (Admin)_             | Summary / overview view.                                                      |
| **Analytics** | _Analytics (Admin)_             | Aggregate / time-range data view.                                             |

Other named in-session views (recap of [§10](#10-in-session-vocabulary)):

- **Court View** — physical-court layout for the Que Master
- **Queue View** — horizontal slider of upcoming matches
- **Add Match Interface** — Que Master's pick-from-Pool screen
- **Player View** — read-only session view for non-host players
- **Umpire View** — single-match scoring screen

---

## 18. Tech stack & infrastructure

| Term                           | Meaning                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Monorepo**                   | The whole repo. Managed by Turborepo + pnpm workspaces.                                            |
| **Workspace package**          | An importable internal package (e.g. `@rotra/db`, `@rotra/config`).                                |
| **App Router**                 | Next.js 15 App Router; all four apps use it.                                                       |
| **SSR-first** vs **CSR-first** | Server-rendered first (Player, Admin, Landing) vs client-side rendered (Umpire).                   |
| **TanStack Query**             | Server-state library; canonical for fetched data.                                                  |
| **Redux Toolkit**              | Client-state library; canonical for ephemeral UI state.                                            |
| **Prisma**                     | The ORM layer for the Postgres schema (`@rotra/db`).                                               |
| **Supabase**                   | Backend platform (Postgres + Realtime + Auth + Storage).                                           |
| **RLS**                        | Row Level Security — per-table Postgres policies. Enabled on all tables.                           |
| **PWA**                        | Progressive Web App. The Umpire app is a PWA; the Player app is moving toward PWA install support. |
| **shadcn/ui**                  | Component library used per-app (each app has its own copy).                                        |

---

## 19. Brand assets & mascots

| Term         | Meaning                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| **Mascot**   | One of two stylized 3D characters used across the brand.                                                     |
| **Rion**     | Mascot. Role: _system operator / queue controller_. Personality: calm, confident, efficient.                 |
| **Tara**     | Mascot. Role: _flow / rhythm / gameplay balance_. Personality: sharp, calm, slightly more dynamic than Rion. |
| **Wordmark** | The text-only logo (`ROTRA`).                                                                                |
| **Symbol**   | Future abstract rotation/orbit shape (planned, not shipped).                                                 |

**Brand colors:**

| Token              | Hex       | Use                           |
| ------------------ | --------- | ----------------------------- |
| `color-bg-base`    | `#0B0B0C` | App background                |
| `color-bg-surface` | `#1A1A1D` | Cards, modals                 |
| `color-accent`     | `#00FF88` | Primary CTA, "Playing" status |
| `color-accent-dim` | `#00CC6A` | Pressed accent state          |
| `color-error`      | `#FF4D4D` | Validation errors             |
| `color-warning`    | `#FFB800` | Pending / warning states      |

**Theme:** Dark mode only — no light theme planned.

---

## 20. Database ↔ product term mapping

The DB schema was written before this glossary and uses some older names. **Decision (2026-04-27):** plan a rename migration **within MVP** so the DB matches the product copy. Until that migration ships, this table is the bridge. After it ships, this table moves to a "historical" appendix.

Treat the **product term** as authoritative for new docs / UI / code-comments. Treat the **DB term** as the literal SQL identifier — do **not** rename DB columns ad-hoc outside the planned migration; coordinate via `docs/database/`.

**Planned MVP renames** (mark each as ✅ when shipped):

| Current DB identifier                                 | Will become                                              | Status     |
| ----------------------------------------------------- | -------------------------------------------------------- | ---------- |
| `queue_sessions.schedule_type` / `schedule_type_enum` | `session_type` / `session_type_enum`                     | ⏳ Planned |
| `queue_sessions.origin = 'club_queue'`                | `'club_que'`                                             | ⏳ Planned |
| `queue_sessions.origin = 'player_organized'`          | `'friendly'`                                             | ⏳ Planned |
| `match_status` value `unscored` (if present)          | Removed; consolidate into `voided`                       | ⏳ Planned |
| `que_master` enum value naming sweep                  | Audit `club_role_enum` for any `queue_master` stragglers | ⏳ Planned |

| Product term (canonical) | DB identifier                                                                                       | Notes                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Club Que Session         | `queue_sessions.origin = 'club_queue'`                                                              | Origin enum value                            |
| Friendly Que Session     | `queue_sessions.origin = 'player_organized'`                                                        | Origin enum value                            |
| Session type             | `queue_sessions.schedule_type` (`schedule_type_enum`)                                               | Values: `mmr`, `fun_games`                   |
| Session host             | `queue_sessions.host_id`                                                                            | Resolves to a `profiles.id`                  |
| Player session status    | `session_registrations.player_status` (`player_session_status_enum`)                                |                                              |
| Admission status         | `session_registrations.admission_status` (`admission_status_enum`)                                  |                                              |
| Member state             | `club_members.status` (`member_status_enum`)                                                        |                                              |
| Session waitlist         | `session_registrations.admission_status = 'waitlisted'` + `waitlist_position`                       | Distinct from `waitlist_signups`!            |
| Marketing waitlist       | `waitlist_signups` table                                                                            | Pre-launch landing-page email capture        |
| Calibrating              | `profiles.mmr_matches_played < calibration.required_matches` AND `calibration_completed_at IS NULL` | Derived state, not a stored enum             |
| Verified                 | `profiles.is_verified` (generated column)                                                           | FB linked + email verified + onboarding done |
| Profile completion bonus | `profiles.profile_completed_bonus_claimed`                                                          | One-time flag                                |
| Demotion request         | `club_demotion_requests`                                                                            | Distinct table                               |
| Complaint                | `complaints`                                                                                        | Distinct table                               |
| Moderation flag          | `moderation_flags`                                                                                  | Auto-generated; not the same as a Complaint  |
| Kill switch              | `kill_switches`                                                                                     | Has `environment` column                     |
| EXP Ledger               | `exp_transactions`                                                                                  | Append-only                                  |
| MMR Ledger               | `mmr_transactions`                                                                                  | Append-only; has `is_calibration` flag       |
| Skill dimension          | `skill_dimensions`                                                                                  | Admin-editable                               |
| Sub-skills               | `skill_dimensions.sub_skills` (JSONB)                                                               |                                              |
| Self-assessment          | `player_self_assessments`                                                                           |                                              |

---

## 21. Phasing & MVP

| Phase                                       | Scope                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **MVP / Phase 1 — Core Queue System**       | End-to-end session management without ratings or gamification.                                                     |
| **Phase 2 — Ratings & Reviews**             | Skill Rating, reviews, EXP, anti-sandbagging, club leaderboard, sharing.                                           |
| **Phase 3 — Tournaments & Platform Growth** | Tournament module (brackets, skill tiers), global leaderboard, badges, Admin role and tools, payment integrations. |

(Tournament terminology — _Bracket_, _Single elimination_, _Double elimination_, _Round robin_, _Tournament admin_ — is intentionally underspecified at this stage; revisit when Phase 3 begins.)

---

## 22. Deprecated / retired terms

These terms appeared in earlier docs or specs. Don't use them in new writing — replace per the column on the right.

| Old term                                          | Replace with                                                    | Reason                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Rotra (title case)                                | **ROTRA** (all caps)                                            | Brand wordmark is always all-caps. Lowercase `rotra` allowed only in npm names / paths / URLs.                      |
| Queue Master                                      | **Que Master**                                                  | Brand spelling — "Que" is intentional                                                                               |
| Schedule type (as session setting)                | **Session type**                                                | "Schedule" overloads with calendar/timing concepts                                                                  |
| Player-organized session                          | **Friendly Que Session**                                        | More descriptive, aligns with brand "Que" prefix                                                                    |
| Club queue session                                | **Club Que Session**                                            | Avoids collision with **Match Queue** (the in-session list)                                                         |
| "Fun Games" used for a Friendly                   | **Regular** (Friendly's only mode)                              | "Fun Games" is reserved for Club Que Sessions. Friendlies are always Regular.                                       |
| Environment management (panel)                    | **Kill Switches**                                               | Functionally identical; old name was uninformative                                                                  |
| Guest Umpire (as a separate role)                 | **Quick Umpire**                                                | Same concept, one canonical name                                                                                    |
| "Rank" meaning leaderboard position               | **Position** / **Standing**                                     | "Rank" reserved for MMR bracket                                                                                     |
| "Users" (as the canonical entity)                 | **`profiles`** / **Player**                                     | DB table is `profiles`; product noun is "Player"                                                                    |
| Just "waitlist" (ambiguous)                       | **Session waitlist** OR **Marketing waitlist**                  | Two different concepts share the word                                                                               |
| Just "queue" (ambiguous)                          | **Match Queue** OR specify session-vs-match context             | Easy to confuse with the "Que" brand prefix                                                                         |
| Match outcome **Unscored**                        | **Voided**                                                      | Same concept, "Voided" reads better. Don't introduce a separate "unscored" state.                                   |
| **Walkover** (when used to mean substitution)     | **Substitution**                                                | Substitution is the canonical action; behavior splits by Session type (see [§5](#5-match-outcomes--match-anatomy)). |
| Que Schedule used as if distinct from Que Session | (no replacement — they're synonyms)                             | Either word is fine; both refer to the same `queue_sessions` row.                                                   |
| Review used to mean a numeric star rating         | **Rating**                                                      | Rating = stars. Review = written text. They're different things in the same form.                                   |
| Review used to mean the whole submission          | **Rate and Review** (the action) or **Submission** (the record) | "Review" is reserved for the written-text part.                                                                     |
| **Queue Session**                                 | **Que Session**                                                 | Brand spelling — use **Que** for ROTRA session terminology                                                          |
| **Attended** (generic)                            | Specific attendance state (**I Am In**, **I Am Prepared**, etc.) | One generic value must not represent all in-session conditions                                                      |
| **Ranked Match** (as session type label)          | **Club Que Session — MMR** or **Session type = MMR**            | Use canonical session type naming                                                                                   |
| **Queue** used interchangeably with **Que**       | **Match Queue** (upcoming matches) or **Que Session** (the session) | "Que" is the brand prefix; "Queue" names the ordered match list only                                               |
| **Auto queue** / **smart queue**                  | **Automatic Queueing**                                          | Canonical feature name                                                                                              |
| **Unfair Training Style**                         | **Overload Training**                                           | Canonical matchmaking mode name                                                                                     |

---

## 23. Open / TBD

Items still pending after the 2026-04-27 interview pass.

| Item                                | Open question                                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tournament vocabulary**           | Defer until Phase 3 begins.                                                                                                                                                                                                           |
| **Sub-skill naming convention**     | Some sub-skills appear in multiple dimensions (e.g. "Deception" in Net & Touch _and_ Game Intelligence; "Placing" in Precision & Control _and_ Game Intelligence). Are those duplicates or distinct (execution-vs-tactical) variants? |
| **`age` / `playing_since` privacy** | Schema marks `age` as "private, for analytics only" — confirm UX doesn't expose it on profiles.                                                                                                                                       |
| **Tournament wins last year**       | The schema has `tournament_wins_last_year` (`'none'` / `'1_to_3'` / `'4_plus'`) — confirm this is intentional self-reported gating with no verification path.                                                                         |
| **Substitution review weighting**   | When a Substitution happens in a Friendly / Fun Games match, do the substitute and substituted player both rate each other / get rated? Or only the players who finished the match?                                                   |
| **Review window length**            | The glossary documents a 24h Rate-and-Review window after Finalize. Confirm this is the actual product rule (not inferred).                                                                                                           |
| **Automatic Queueing tuning constants** | Weights, thresholds, and probability ranges in [`client_app/automatic_queueing.md`](./client_app/automatic_queueing.md) §41 are recommended defaults — final values await product approval.                                      |
| **Adaptive Mode**                   | Future Automatic Queueing extension documented in `automatic_queueing.md` §42 — not required for initial implementation.                                                                                                              |

### Resolved on 2026-04-27 (paper trail)

| Item                                       | Resolution                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ROTRA casing                               | All-caps everywhere — UI, docs, code comments, prose. Lowercase only in npm names / paths / URLs.                                                                                         |
| DB rename plan                             | Plan migration within MVP (see [§20](#20-database--product-term-mapping)).                                                                                                                |
| Que Schedule vs Que Session                | Synonyms. Both refer to the same entity. Either word is fine.                                                                                                                             |
| "Regular" Friendly vs "Fun Games" Friendly | "Regular" is canonical for **Friendly Que Session**. "Fun Games" is reserved for **Club Que Session — Fun Games**. Don't mix them.                                                        |
| Voided vs Unscored                         | "Voided" wins. "Unscored" is deprecated.                                                                                                                                                  |
| Match: Completed vs Finalized              | Two distinct states. Finalized = score locked in, reviews not yet complete. Completed = score + all reviews in. EXP/MMR can settle at Finalized; Skill Rating updates wait for Completed. |
| Walkover                                   | Renamed to **Substitution**. Behavior is mode-dependent: Friendly / Fun Games keeps the match (substitute plays on, substituted player auto-loss); MMR auto-Voids and moves on.           |
| Review vs Rating                           | **Rating** = numeric 1–5 stars. **Review** = written text. Combined CTA = **Rate and Review**.                                                                                            |

---

## Maintenance checklist

When you change a term:

1. Update this file (`00_ubiquitous_language.md`) first.
2. Add the old name to the **Deprecated / retired terms** table with a replacement and a reason.
3. Open a doc-cleanup task to sweep `docs/` and rename usages.
4. Open code-cleanup tasks per app (low priority — code casing is not enforced).
5. If the DB needs to change, propose a migration in `docs/database/` rather than renaming columns silently.
6. Note the change date in the relevant section so we have a paper trail.
