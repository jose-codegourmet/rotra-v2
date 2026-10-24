# 17 — Risks & Mitigations

## Overview

This document captures known risks across product, technical, and operational dimensions. Each risk includes an impact level, likelihood assessment, and concrete mitigations — both those implemented in the MVP and those planned for later phases.

---

## Risk Registry

### Rating & Review Risks

---

#### Rating Abuse / Coordinated Inflation

| Attribute | Detail |
|-----------|--------|
| Description | A group of players systematically rates each other 5/5 to artificially inflate their skill ratings |
| Impact | High — corrupts the skill rating system, undermines anti-sandbagging, and misrepresents leaderboards |
| Likelihood | Medium — likely to happen in tight-knit groups |
| MVP Mitigation | Source weighting (Que Master and Umpire outweigh peer ratings); rolling average dilutes short bursts |
| Phase 2 Mitigation | Coordinated inflation detection: flag clusters of players who consistently rate each other at maximum |
| Phase 3 Mitigation | Admin review and manual correction; ability to retroactively zero out ratings from flagged clusters |

---

#### Sandbagging

| Attribute | Detail |
|-----------|--------|
| Description | Player deliberately keeps self-declared level low to gain easier matches or future bracket advantages |
| Impact | High — unfair competition, discourages legitimate players |
| Likelihood | Medium — especially prevalent when tournaments introduce bracket advantages |
| MVP Mitigation | System-computed level shown when divergence from external ratings is detected; flag visible to Que Masters |
| Phase 2 Mitigation | Automated divergence detection using 4 signals (see `06_skill_rating.md`) |
| Phase 3 Mitigation | Tournament entry locked by computed level; Admin can permanently set a player's minimum tier |

---

#### Retaliatory or Toxic Reviews

| Attribute | Detail |
|-----------|--------|
| Description | Player submits malicious or abusive text reviews after losing a match |
| Impact | Medium — damages player reputation and community trust |
| Likelihood | High — inevitable in any competitive context |
| MVP Mitigation | Profanity filter blocks slurs and explicit language; anonymous display reduces targeted abuse |
| Phase 2 Mitigation | Players can flag received reviews; Club Owner can review and remove |
| Phase 3 Mitigation | Admin can remove reviews platform-wide; repeated abusers can have review privileges suspended |

---

### Technical Risks

---

#### Real-Time Sync Failures

| Attribute | Detail |
|-----------|--------|
| Description | WebSocket connection drops; players see stale queue data; Que Masters make decisions based on outdated state |
| Impact | High — causes queue disputes, double-booking, missed matches |
| Likelihood | Medium — particularly in venues with poor WiFi/cellular coverage |
| MVP Mitigation | Auto-reconnect with exponential backoff; offline state banner; server is source of truth; full state sync on reconnect |
| Future Mitigation | Optimistic UI updates with server reconciliation; edge caching for read-heavy views (queue, standings) |

---

#### Concurrent Queue Edits (Multi-Que Master)

| Attribute | Detail |
|-----------|--------|
| Description | Two Que Masters make conflicting edits simultaneously (e.g. both assign the same player to different courts) |
| Impact | Medium — confusion, duplicate matches, player frustration |
| Likelihood | Medium — especially with 3+ Que Masters |
| MVP Mitigation | Last-write-wins with visible change attribution; audit trail shows which Que Master made each change |
| Future Mitigation | Optimistic locking on specific resources (e.g. a player cannot be in two matches simultaneously at the server level) |

---

#### Data Loss on Session Crash

| Attribute | Detail |
|-----------|--------|
| Description | App or server crashes mid-session; queue state, scores, or payment records are lost |
| Impact | High — irrecoverable match data; trust damage |
| Likelihood | Low if architected correctly |
| MVP Mitigation | Server-authoritative state (client is only a view); all state persisted to database on every write; no client-only state for critical data |
| Future Mitigation | Event sourcing / write-ahead log for session state; periodic session snapshots |

---

### Operational Risks

---

#### Player No-Shows

| Attribute | Detail |
|-----------|--------|
| Description | Accepted players don't show up; slots are wasted; waitlisted players miss out |
| Impact | Medium — disrupts session flow; frustrates waitlisted players |
| Likelihood | High — common in casual settings |
| MVP Mitigation | Two-step attendance (I Am In → I Am Prepared); 15-minute no-show alert to Que Master; Que Master can release slot manually |
| Future Mitigation | No-show tracking in player profile; configurable auto-release after N minutes without check-in |

---

#### Cost Calculation Disputes

| Attribute | Detail |
|-----------|--------|
| Description | Players dispute their cost share (e.g. disagree on shuttles used or markup) |
| Impact | Medium — friction between players and Que Master; payment refusals |
| Likelihood | Medium |
| MVP Mitigation | Transparent formula visible to all players; shuttle count and cost breakdown shown in session info |
| Future Mitigation | Shuttle log (Que Master records each new shuttle opened with a timestamp); full cost audit trail per player |

---

#### Que Master UX Overload

| Attribute | Detail |
|-----------|--------|
| Description | The Que Master interface is too complex; Que Masters revert to manual methods |
| Impact | High — if Que Masters don't use the app, the core use case fails |
| Likelihood | Medium — session management has genuinely high information density |
| MVP Mitigation | Three-tab interface (Court View, Queue View, Add Match) with clear primary actions; smart defaults (auto-sort by waiting time); no mandatory steps blocked by secondary features |
| Future Mitigation | Onboarding walkthrough for first-time Que Masters; contextual help tooltips; simplified mode for small sessions (2 courts or fewer) |

---

#### Duplicate Facebook Accounts

| Attribute | Detail |
|-----------|--------|
| Description | A player creates a second Facebook account to bypass a sandbagging flag or rating penalty |
| Impact | Medium — undermines anti-abuse systems |
| Likelihood | Low — requires effort; Facebook's own verification limits this |
| MVP Mitigation | Server-side Facebook user ID deduplication prevents two accounts from the same Facebook identity |
| Future Mitigation | Device fingerprinting (privacy-preserving); Admin ability to link and merge suspected duplicate accounts |

---

#### Venue QR Scanning Failures

| Attribute | Detail |
|-----------|--------|
| Description | Players cannot scan the session QR code at the venue (poor lighting, phone camera issues) |
| Impact | Low — fallback exists |
| Likelihood | Medium |
| MVP Mitigation | App registration (non-QR) is always available as a fallback; Que Master can manually admit players from the admitted list |
| Future Mitigation | NFC tag support for tap-to-join at venues |

---

## Risk Summary Matrix

| Risk | Impact | Likelihood | Status |
|------|--------|-----------|--------|
| Rating abuse / coordinated inflation | High | Medium | Partially mitigated (MVP) |
| Sandbagging | High | Medium | Partially mitigated (MVP) |
| Retaliatory reviews | Medium | High | Partially mitigated (MVP) |
| Real-time sync failures | High | Medium | Mitigated (MVP) |
| Concurrent queue edits | Medium | Medium | Partially mitigated (MVP) |
| Data loss on session crash | High | Low | Mitigated (MVP) |
| Player no-shows | Medium | High | Partially mitigated (MVP) |
| Cost disputes | Medium | Medium | Partially mitigated (MVP) |
| Que Master UX overload | High | Medium | Partially mitigated (MVP) |
| Duplicate Facebook accounts | Medium | Low | Mitigated (MVP) |
| QR scanning failures | Low | Medium | Mitigated (MVP) |
