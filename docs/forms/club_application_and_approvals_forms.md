# Forms — club application & admin approvals

This note lists **Zod + react-hook-form** surfaces added for the club application phase 2 UI work (and where they live in the repo).

## Client app (`apps/client`)

| Form | File | Schema | Used on / by |
|------|------|--------|----------------|
| **Club application** (create / update pending) | [`apps/client/src/components/modules/clubs/club-application-form/ClubApplicationForm.tsx`](../../apps/client/src/components/modules/clubs/club-application-form/ClubApplicationForm.tsx) | [`schema.tsx`](../../apps/client/src/components/modules/clubs/club-application-form/schema.tsx) (`clubApplicationCreateBodySchema`, limits, empty defaults) | [`/clubs/apply`](../../apps/client/src/app/(protected)/clubs/apply/page.tsx) — player submits or updates a club application |

**Helpers in the same module**

- [`club-application-defaults.ts`](../../apps/client/src/components/modules/clubs/club-application-form/club-application-defaults.ts) — maps API/pending DTO rows into form default values; not a form component.

**Server validation (same schema)**

- [`apps/client/src/lib/api/club-application-body-parse.ts`](../../apps/client/src/lib/api/club-application-body-parse.ts) — `parseClubApplicationCreateBody` uses `clubApplicationCreateBodySchema` so API errors align with the form.

## Admin app (`apps/admin`)

| Form | File | Schema | Used on / by |
|------|------|--------|----------------|
| **Reject application** (single + bulk) | [`apps/admin/src/components/modules/club-applications/RejectReasonFormModal.tsx`](../../apps/admin/src/components/modules/club-applications/RejectReasonFormModal.tsx) | [`apps/admin/src/constants/club-application-reject.ts`](../../apps/admin/src/constants/club-application-reject.ts) (`clubApplicationRejectFormSchema`) | [`ClubApplicationsApprovalsView`](../../apps/admin/src/components/modules/club-applications/ClubApplicationsApprovalsView.tsx) — `/approvals/club-applications` |

## Related UI (not RHF+Zod forms)

- **Submit / update confirm (client):** [`ClubApplicationSubmitConfirmDialog`](../../apps/client/src/components/modules/clubs/club-application/ClubApplicationSubmitConfirmDialog.tsx) — `AlertDialog` only; no field schema.
- **Approve confirm (admin):** [`ApproveConfirmModal`](../../apps/admin/src/components/modules/club-applications/ApproveConfirmModal.tsx) — `Dialog` only; no field schema.

---

*Other apps in the monorepo (e.g. onboarding, landing waitlist) define their own `useForm` flows and are out of scope for this list.*
