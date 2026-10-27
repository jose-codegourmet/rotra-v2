# Queue screen modules

**Audience:** dedicated club account / Queue Master, except the public session page.

**Reference prototype:** [`docs/frames/queue-app/rotra-queue.html`](../../../../frames/queue-app/rotra-queue.html) — open it in a browser and sign in with any password. Updated specs below follow it.

| Module | Surfaces |
|---|---|
| [Access and home](access-home.md) | Club login, license gate, dashboard with calendar, club settings |
| [Session setup](session-setup.md) | Three-page setup, preparation, download, start |
| [Financials and inventory](financials-inventory.md) | Optional cost estimate step, club inventory |
| [Players and roster](players-roster.md) | Saved players, add/search/link, identity verification, level assignment, presence |
| [Session console](session-console.md) | Session / Queue / Players / Leaderboard views, courts, add court, time |
| [Shared match queue](match-queue.md) | Manual, player picker, Suggest, Auto queue, ordering, protection, attention, regeneration |
| [Match control](match-control.md) | Dispatch/start, pick another, active game, substitutions, outcome confirmation, invalidation |
| [Offline recovery](offline-recovery.md) | Download states, sync status, device continuation, conflicts |
| [Session finalization](session-finalization.md) | Online closure, integrity checks, invalid session, processing |
| [Results and sharing](results-sharing.md) | Three slides, publishing, exports, session record |
| [Public session](public-session.md) | Details/Participants, published results, stale/deleted pages |

Screen IDs begin with `Q-`. These are specifications, not route names. Business source: [Queue](../../../../business_logic/product/queue/README.md).

## Prototype-only behavior

These exist in the prototype for review and are **not** product features:

- The **Prototype** button and its sheet: simulate offline, simulate expired license, sign out, reset demo data.
- Any password signs in; data is fictional (Lahug Smash Club, Cebu) and saved only in the browser.
- Download, sync, and finalization use short timers instead of real work.
- **Download N images** is disabled.
