# Phase 2 — Club application UI components

## Phase 1 environment (ops)

Set these on the server (or in `.env` for local dev) so admin actions and the SLA job can attribute rows correctly:

| Variable | Used by |
|----------|---------|
| `ROTRA_ADMIN_ACTOR_PROFILE_ID` | Admin approve/reject/bulk-reject — `admin_action_log.admin_id` when the `X-Rotra-Admin-Profile-Id` header is absent |
| `ROTRA_SLA_ACTOR_PROFILE_ID` | SLA auto-reject — must be a valid `profiles.id` (can match the admin actor in small teams) |
| `ROTRA_CRON_SECRET` | `POST /api/cron/club-applications-sla` — `Authorization: Bearer <secret>` |

---

This document lists **presentational and layout work** deferred from phase 1 (DB, API routes, server mutations, thin pages, and React Query hooks only). Phase 1 may use minimal inline markup; phase 2 replaces it with polished, spec-aligned components.

**References**

- Client form and states: [`docs/views/client_app/player/club_application.md`](../views/client_app/player/club_application.md)
- Client clubs hub: [`docs/views/client_app/common/clubs_hub.md`](../views/client_app/common/clubs_hub.md) (if present)
- Admin approvals: [`docs/views/admin_app/approvals.md`](../views/admin_app/approvals.md)
- Business rules: [`docs/business_logic/client_app/04_club_system.md`](../business_logic/client_app/04_club_system.md), [`docs/business_logic/admin_app/04_approvals_and_moderation.md`](../business_logic/admin_app/04_approvals_and_moderation.md)

---

## Client app (`apps/client`)

### `/clubs/apply`

- [ ] **ClubApplicationForm** — single-column layout; field order and validation UX per view spec (character counters, inline errors).
- [ ] **Confirmation modal** — submit / update confirm copy.
- [ ] **Pending banner** — “Under review”, SLA copy, link to applications history when that route exists.
- [ ] **Rejected state panel** — rejection reason + note summary; CTA to new application when allowed.
- [ ] **Loading / error boundaries** — skeleton or spinner consistent with app patterns.

### `/clubs` hub

- [ ] Replace placeholder **New Club / Create Club** controls with design-system `Button` / `Link` matching clubs hub spec.
- [ ] Club list cards (when moving off mocks): location subtitle, role badge, session hints per [`04_club_system.md`](../business_logic/client_app/04_club_system.md).

### Shared (client)

- [ ] **Enum labels** — human-readable strings for `expected_player_bucket` and any application status shown to the player.
- [ ] **Storybook** stories for the above where the project already uses Storybook for similar flows.

---

## Admin app (`apps/admin`)

### `/admin/approvals/club-applications`

- [ ] **ApprovalsPageLayout** — two-column split (queue + detail) desktop; stacked / sheet mobile per [`approvals.md`](../views/admin_app/approvals.md).
- [ ] **ApplicationQueueTable** — columns, sortable headers, filters, SLA countdown cell, status pills.
- [ ] **ApplicationDetailPanel** — full payload, “View profile” link, optional player activity summary.
- [ ] **NameCollisionBanner** — list of clubs with similar name (city, owner, status, dates).
- [ ] **ApproveConfirmModal** / **RejectReasonModal** — required rejection enum + optional note.
- [ ] **BulkRejectToolbar** — multi-select + shared reason/note.
- [ ] **ExportCsvButton** — client-side CSV from current filtered rows (or server-driven export if large lists).

### Tabs shell

- [ ] **ApprovalsTabs** — Club applications | Demotions (demotions remains placeholder until that epic ships).

### Shared (admin)

- [ ] **Rejection reason** labels for `application_rejection_reason_enum`.
- [ ] Storybook for table + modals if applicable.

---

## Out of scope for phase 2 UI (later epics)

- Demotion queue full UI and resolution flows.
- Profile “applications history” page (`profile_applications` view spec) unless phase 1 already added a bare route.
- SLA **cron** wiring (phase 1 may add the handler only); monitoring and retries are ops follow-up.

---

## Acceptance for phase 2

- Client `/clubs/apply` matches responsive and token notes in the view doc.
- Admin approvals match interaction and modals in the admin approvals view doc.
- No regression to phase 1 data contracts: hooks and API DTOs stay stable; components consume the same types.
