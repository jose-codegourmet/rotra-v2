# Client App — Business Logic

The Client App is the primary user-facing product. It serves three types of users — **Players**, **Club Owners**, and **Que Masters** — and contains everything needed to run, attend, and track badminton sessions.

---

## Who Uses This App

| User | What They Do |
|------|-------------|
| **Player** | Joins clubs, registers for sessions, views queue position, reviews matches, tracks stats |
| **Club Owner** | Creates clubs, manages members, assigns Que Masters, views financials |
| **Que Master** | Sets up sessions, manages the match queue, tracks payments, assigns umpires |

> Quick Umpires and Admins interact via their own dedicated apps. See [`../umpire_app/`](../umpire_app/README.md) and [`../admin_app/`](../admin_app/README.md).

---

## Document Index

| File | Section | Description |
|------|---------|-------------|
| [01_product_vision.md](./01_product_vision.md) | 1 | What the app is, who it serves, and why it exists |
| [02_user_roles.md](./02_user_roles.md) | 2 | Player, Club Owner, Que Master — permissions and boundaries |
| [03_authentication.md](./03_authentication.md) | 3 | Facebook login, single-account enforcement, token handling |
| [04_club_system.md](./04_club_system.md) | 4 | Club states, membership, join methods, Que Master assignment |
| [05_player_profile.md](./05_player_profile.md) | 5 | Profile fields, play style, gear showcase, statistics |
| [06_skill_rating.md](./06_skill_rating.md) | 6 | Rating scale, source weights, submission window, anti-sandbagging |
| [07_review_system.md](./07_review_system.md) | 7 | Review types, anonymity, moderation, match completion logic |
| [08_queue_session.md](./08_queue_session.md) | 8 | **Canonical** Que Sessions spec — lifecycle, Lobby, admission, waitlist, Feed, payments |
| [automatic_queueing.md](./automatic_queueing.md) | — | **Canonical** Automatic Queueing — intelligent matchmaking engine, modes, scoring, Que Master controls |
| [09_cost_system.md](./09_cost_system.md) | 9 | Cost inputs, per-player formula, payment tracking |
| [10_leaderboard.md](./10_leaderboard.md) | 10 | Scopes, ranking criteria, data sources, display |
| [11_tournament.md](./11_tournament.md) | 11 | Future tournament module — brackets, tiers, EXP multiplier |
| [12_match_history.md](./12_match_history.md) | 12 | Per-player persistent history record fields |
| [13_sharing.md](./13_sharing.md) | 13 | Shareable items, formats, Open Graph cards |
| [14_gamification.md](./14_gamification.md) | 14 | MMR vs EXP eligibility, EXP table, asymmetric mixed-rank rules, ranking tiers, future badges |
| [15_notifications.md](./15_notifications.md) | 15 | Session reminders, in-session alerts, post-session notifications |
| [16_mvp_plan.md](./16_mvp_plan.md) | 16 | Phase 1 / 2 / 3 feature lists |
| [17_risks.md](./17_risks.md) | 17 | Risk registry with impact levels and mitigations |
| [18_canonical_rules.md](./18_canonical_rules.md) | 18 | Canonical rules including session types, EXP/MMR eligibility, void handling |
| [19_player_comparison.md](./19_player_comparison.md) | 19 | Side-by-side player comparison — H2H record, skill radar, performance stats |
| [20_onboarding.md](./20_onboarding.md) | 20 | Player onboarding wizard — name, age, playing since, court position, tournament wins |
| [21_mmr_calibration.md](./21_mmr_calibration.md) | 21 | MMR calibration period — amplified deltas for first 10 competitive matches |

---

## Key Flows

### Player Flow
```
Register (Facebook Login)
  → Join a Club (invite link / QR / request)
    → Create a player-organized session (optional) OR register for a club / player session
      → Register for a Queue Session
        → Confirm attendance ("I Am In" → "I Am Prepared")
          → Get placed in a match by session host
            → Play match (optionally umpired)
              → Submit post-match review and skill rating
                → Stats and session standings updated; EXP/MMR only if club MMR schedule
```

### Club Owner Flow
```
Submit club application (/clubs/apply) → Admin approves in Admin App → Club row created
  → Configure membership settings
    → Invite / approve members
      → Assign Que Master(s)
        → Monitor sessions and club statistics
(Additional clubs: repeat application + approval for each new club.)
```

### Que Master Flow
```
Assigned by Club Owner
  → Create club queue session (Schedule type: MMR vs Fun Games; courts, cost, format)
    → Open session for player registration
      → Manage player statuses (arrival, readiness)
        → Build and manage the match queue (Manual Queueing and/or Automatic Queueing)
          → Assign umpires per match (→ Umpire App)
            → Track payments
              → Finalize matches and close session
```

---

## Cross-App Integration Points

| Interaction | This App | Other App |
|-------------|----------|-----------|
| Que Master generates Quick Umpire token | Client App | Token opens in Umpire App |
| Umpire submits score | Umpire App | Score appears on Client App Court View |
| Smart monitoring alert (score nearing end) | Client App receives push | Triggered by Umpire App score updates |
| Club application approval | Client App (`/clubs/apply`, `/profile/applications`) | Admin App (`/admin/approvals/*`; see `database/12_club_governance.md`) |
| Kill switch disables a feature | Admin App toggles | Client App feature disappears |
