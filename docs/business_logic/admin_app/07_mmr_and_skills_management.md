# Admin App — 07 MMR and Skills Management

## Overview

This module defines how Admins manage competitive progression behavior for match outcomes. It covers:

- MMR asymmetry settings used in mixed-rank matches
- Match-related EXP awards tied to competitive sessions
- MMR calibration parameters for new competitive players
- Operational and audit guardrails when changes are applied

Canonical data model and constraints come from `docs/database/06_gamification.md` and related Prisma enums/models.

---

## Scope Boundaries

### In Scope

- `mmr_asymmetry_config` values used to calculate match MMR deltas
- Match EXP behavior for `match_played`, `match_won`, and void reversals
- Calibration config (`calibration.required_matches`, `calibration.mmr_multiplier`)
- Operational rules for applying changes safely in production

### Out of Scope

- Non-match EXP keys not present in `exp_reason_enum`
- Historical recomputation/backfill of already written ledger entries
- Changes to enum sets without a schema migration process

---

## Part A — MMR Management

### Eligible Sessions

MMR updates are applied only when the session is:

- `origin = club_queue`
- `schedule_type = mmr`

No MMR update should be produced for non-competitive session types.

### Editable Config Keys

Admins can manage the following fields under `platform_config` key `mmr_asymmetry_config`:

- `mmr_gap_threshold`
- `lower_rated_win_multiplier`
- `lower_rated_loss_multiplier`
- `higher_rated_win_multiplier`
- `higher_rated_loss_multiplier`

### Core Guardrails

- MMR remains append-only via `mmr_transactions`
- Voided matches are reversed through compensating rows (`match_voided_reversal`)
- MMR floor is `0` (application layer caps downward deltas)
- Config changes affect future transactions only

---

## Part B — Skills XP Management

### Match EXP Rules

Admin control in this module is limited to match-linked EXP reasons backed by `exp_reason_enum`:

- `match_played`
- `match_won`
- `match_voided_reversal` (system-generated compensating behavior)

### Core Guardrails

- EXP remains append-only via `exp_transactions`
- Original ledger rows are never edited or deleted
- Voiding inserts inverse rows with reason `match_voided_reversal`
- Changes apply forward only and do not recalculate historical EXP

---

## Part C — Operational Workflow

### Change Procedure

1. Admin reviews candidate values and confirms the impact scope (future matches only).
2. Admin saves config in the active environment.
3. System writes an audit entry including actor, key changed, previous value, new value, and timestamp.
4. Admin verifies behavior on newly completed qualifying matches.

### Rollback Procedure

- Revert by writing a new config value (never by mutating historical ledger rows)
- Validate recovery by checking new ledger inserts after rollback
- If scoring instability is detected, disable the associated feature through kill switches while triaging

---

## Part D — Calibration Config

### Purpose

New players start at 1000 MMR. During their first N competitive matches (the **calibration period**), MMR deltas are amplified so ratings converge quickly toward the player's true skill level.

### Editable Config Keys

Admins can manage the following fields under `platform_config`:

- `calibration.required_matches` — number of completed MMR matches to finish calibration (default: 10)
- `calibration.mmr_multiplier` — multiplier applied to all MMR deltas during calibration (default: 2.0)

### Core Guardrails

- Changes apply **forward only** — mid-calibration players use the config active at the time each match completes
- Lowering `required_matches` may immediately complete calibration for players whose `mmr_matches_played` already meets the new threshold (evaluated at next match completion)
- Raising `required_matches` does **not** re-open calibration for players whose `calibration_completed_at` is already set
- Setting `calibration.mmr_multiplier` to 1.0 effectively disables amplification while retaining calibration tracking and the visibility indicator
- Calibration transactions are flagged with `is_calibration = true` in `mmr_transactions` for audit purposes

Reference: `[../client_app/21_mmr_calibration.md](../client_app/21_mmr_calibration.md)`, `[05_platform_config.md](./05_platform_config.md)`

---

## Part E — Audit and Compliance

Every change to MMR/Skills XP configuration must capture:

- Admin identity (`updated_by`)
- Exact key path changed
- Previous and new values
- Environment (`dev`, `staging`, `production`)
- Change timestamp and reason note (if required by policy)

This audit trail supports post-incident analysis and protects progression integrity.

---

## Dependencies and References

- `docs/database/06_gamification.md`
- `packages/db/prisma/models_gamification.prisma`
- `packages/db/prisma/models_admin.prisma`
- `docs/business_logic/admin_app/02_kill_switches.md`
- `docs/business_logic/admin_app/05_platform_config.md`
