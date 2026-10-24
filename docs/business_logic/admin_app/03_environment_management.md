# Admin App — 03 Environment Management

## Overview

The platform runs in three environments. Each environment has its own dedicated Admin App instance — they are always paired:

| Admin App instance | Paired with |
|--------------------|-------------|
| Dev Admin App | Dev Client App |
| Staging Admin App | Staging Client App |
| Prod Admin App | Prod Client App |

An Admin App instance only manages and configures its own paired environment. There is no cross-environment switching or control from within a single Admin App. Environment-specific configurations are managed here — not in code or `.env` files checked into source control.

---

## Environments

### Development (`dev`)

| Property | Value |
|----------|-------|
| Purpose | Local and team development; feature work |
| Data | Seeded fake data; no real user accounts |
| Facebook Auth | Uses a Facebook test app — no real accounts |
| External services | Stubbed or sandboxed |
| Kill switches | All features ON by default; freely toggled |
| Access | Internal team only |

### Staging (`staging`)

| Property | Value |
|----------|-------|
| Purpose | Pre-production testing; QA; stakeholder demos |
| Data | Anonymized copy of production data (refreshed periodically) OR synthetic dataset |
| Facebook Auth | Uses a Facebook test app — real accounts can be whitelisted |
| External services | Sandbox mode for payment providers |
| Kill switches | Mirror of production state unless overridden for testing |
| Access | Internal team + approved external testers |

### Production (`prod`)

| Property | Value |
|----------|-------|
| Purpose | Live platform serving real users |
| Data | Real user data; governed by data retention and privacy policy |
| Facebook Auth | Live Facebook app credentials |
| External services | Live payment integrations |
| Kill switches | Actively managed; changes take immediate effect for all users |
| Access | Internal team only; all changes logged |

---

## Environment Indicator

Each Admin App instance displays its environment prominently at all times (top bar with color coding):

| Environment | Color |
|-------------|-------|
| `dev` | Grey |
| `staging` | Amber |
| `prod` | Red |

The indicator is read-only — it reflects which environment this instance is deployed to. For the Prod Admin App, all destructive or config-changing actions require an explicit "You are in PRODUCTION" confirmation dialog.

---

## Configuration

The Admin App exposes the following configurable values for its environment:

### App URLs

| Key | Description |
|-----|-------------|
| `client_app.base_url` | The public URL of the paired Client App |
| `umpire_app.base_url` | The public URL of the paired Umpire App |
| `admin_app.base_url` | The URL of this Admin App instance |

### Feature Flags

Kill switches are managed within each Admin App instance for its own environment. A switch toggled OFF in staging has no effect on production — they are separate deployments. See [`02_kill_switches.md`](./02_kill_switches.md).

### Notification Config

| Key | Description |
|-----|-------------|
| `notifications.email.enabled` | Whether outbound emails are sent |
| `notifications.push.enabled` | Whether push notifications are sent |
| `notifications.sms.enabled` | Whether SMS alerts are sent (future) |

In `dev` and `staging`, notifications are suppressed by default to prevent accidental messages to real users.

### Rate Limits

| Key | Description | Default (prod) |
|-----|-------------|---------------|
| `rate_limit.session_create_per_day` | Max sessions a Que Master can create per day | 10 |
| `rate_limit.join_requests_per_hour` | Max join requests a player can send per hour | 5 |
| `rate_limit.review_submissions_per_match` | Max review submissions per player per match | 1 |

Rate limits are relaxed in `dev` for testing.

### WebSocket Config

| Key | Description |
|-----|-------------|
| `websocket.reconnect_max_attempts` | Max reconnect attempts before showing offline state |
| `websocket.heartbeat_interval_ms` | Ping interval to maintain connection |

---

## Deployment Pipeline

```
Feature branch
    ↓ (merge to main)
Dev environment (auto-deploy)
    ↓ (manual promote)
Staging environment
    ↓ (manual promote with approval)
Production environment
```

The Admin App does not control deployments directly — that is the CI/CD pipeline's responsibility. Each Admin App instance manages **configuration** and **feature flags** for its own paired environment only, taking effect on whatever version is currently deployed there.

---

## Environment Data Sync

Admins on the **Staging Admin App** can trigger a data refresh from production:

```
Staging Admin App → "Refresh Data from Production"
    ↓
Anonymization pipeline runs (PII stripped, names hashed)
    ↓
Staging database overwritten with anonymized snapshot
    ↓
Audit log entry created
```

This action requires Super Admin privileges. It cannot be undone — staging data is fully replaced. This action is only available on the Staging Admin App; the Prod Admin App has no equivalent.

---

## Audit Log

All configuration changes within an Admin App instance are logged:

| Field | Value |
|-------|-------|
| Timestamp | UTC |
| Admin | Account that made the change |
| Environment | Reflects this instance's environment (`dev` / `staging` / `prod`) |
| Key changed | e.g. `notifications.push.enabled` |
| Old value | Previous value |
| New value | New value |
| Note | Optional free-text explanation |
