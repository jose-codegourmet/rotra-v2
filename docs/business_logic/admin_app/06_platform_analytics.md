# Admin App — 06 Platform Analytics

## Overview

The platform analytics dashboard gives the admin team a real-time view of platform health, growth, and engagement. It is read-only — no data can be modified from here. All time ranges default to the last 30 days and are fully configurable.

---

## Dashboard Sections

### Platform Health (Real-Time)

| Metric | Description |
|--------|-------------|
| Active sessions right now | Count of sessions currently in `Active` state |
| Connected users | Count of WebSocket connections open |
| Error rate | % of API requests returning 5xx in the last 5 minutes |
| Queue depth | Pending background jobs (email, push notifications, stat recalculations) |
| WebSocket health | Connection success rate, average reconnect time |

A red/amber/green status indicator for each metric provides at-a-glance platform health.

---

### Growth Metrics

| Metric | Granularity | Notes |
|--------|-------------|-------|
| New player registrations | Daily / weekly / monthly | Breakdown by join method (Facebook) |
| New clubs created | Daily / weekly / monthly | — |
| Club Owner applications submitted | Daily / weekly / monthly | Includes approval rate |
| Player churn | Monthly | % of players with no activity in last 60 days |
| Returning players | Weekly | % of players active this week who were active last week |

---

### Engagement Metrics

| Metric | Granularity | Notes |
|--------|-------------|-------|
| Sessions created | Daily / weekly / monthly | — |
| Sessions per active club per month | Monthly | Health indicator: target ≥ 4 |
| Queue registration rate per session | Per session average | Target ≥ 80% of attendees |
| Match review completion rate | Per session average | Target ≥ 60% without Que Master override |
| Que Master session setup time | Median | Target < 5 minutes |
| Avg waitlisted player response time | Median | Target < 10 minutes after promotion |

---

### Feature Adoption

| Metric | Description |
|--------|-------------|
| Sessions with umpire assigned | % of sessions where at least one Quick Umpire token was used |
| Reviews submitted per match | Avg number of reviews per match |
| Skill ratings submitted per match | Avg number of skill ratings per match |
| Gear items added per player | Avg gear entries per player profile |
| Sharing actions | Count of match, profile, and leaderboard share taps |
| Leaderboard views | Count of leaderboard page loads (club + global) |

---

### Financial Signals

> These are signals only — not accounting. Tax, overhead, and withdrawals are not tracked here.

| Metric | Description |
|--------|-------------|
| Sessions with cost tracking enabled | % of sessions using the cost system |
| Total markup collected (platform-wide) | Sum of markup amounts across all sessions in range |
| Avg markup per session | Mean markup across sessions with markup enabled |
| Payment completion rate | % of session players marked as Paid by session close |

---

### Moderation Health

| Metric | Description |
|--------|-------------|
| Flagged reviews (pending) | Count of reviews awaiting admin review |
| Flagged reviews resolved (this period) | Count processed in the selected time range |
| Avg review resolution time | Time from flagged to actioned |
| Active account suspensions | Count of currently suspended accounts |
| Club Owner applications pending | Count awaiting approval |

---

## Filtering & Export

All metrics support:

| Filter | Options |
|--------|---------|
| Time range | Last 7d / 30d / 90d / 6m / 1y / All time / Custom date picker |
| Environment | `dev` / `staging` / `prod` (always defaults to prod) |
| Region | Future — when regional data becomes meaningful |

Data can be exported as:
- CSV (raw rows for the selected metric and time range)
- PDF snapshot (formatted report of the current dashboard view)

---

## Access

The analytics dashboard is read-only for all Admin accounts. No data can be edited, deleted, or modified from here. Any action that modifies data routes to the appropriate Admin App section (moderation, config, approvals).
