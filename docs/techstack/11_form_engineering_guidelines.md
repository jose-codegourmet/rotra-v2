# 11. Form Engineering Guidelines

These rules standardize how forms are built and reviewed across ROTRA apps.

---

## Scope

- Applies to all new forms and form refactors in app code.
- Applies to all apps that implement forms (`client`, `admin`, `umpire`).
- Use this together with the data and state docs:
  - [State Layer Rules](./07_state_layer_rules.md#6-state-layer-rules)
  - [Data Fetching Conventions](./08_data_fetching_conventions.md#7-data-fetching-conventions)

---

## Non-Negotiable Standards

- **MUST** use React Hook Form for registration, submission, and field state.
- **MUST** use the React Hook Form `Form` + `Controller` pattern.
- **MUST NOT** use `register`-style field wiring for primary form implementation.
- **MUST** use Zod as the validation schema source of truth.
- **MUST** place form schema next to the form implementation:
- **MUST** colocate form definition files in the same folder:
  - `SomeForm/SomeForm.tsx`
  - `SomeForm/schema.ts`
  - `SomeForm/default.ts`
- **MUST** use React Query mutation flows for form write operations.
- **MUST** keep mutation business logic on the server, never in client form components.
- **MUST** include loading and disabled states during submit/mutation lifecycle.
- **MUST** prevent duplicate submissions while mutation is pending.
- **MUST** show toast feedback for both success and failure outcomes.
- **SHOULD** also show inline validation errors near fields when applicable.

---

## Field and Input Component Policy

- **MUST** use existing components from the relevant app-local `components/ui` folder first.
- If a required field component does not exist, use a native HTML control as a temporary fallback.
- Every native fallback field **MUST** include this exact comment above the fallback usage:
  - `TODO: please create field for this component`
- **SHOULD** replace native fallback with a proper `components/ui` field in the next UI pass.

---

## Form File Structure

- Preferred form module structure:
  - `SomeForm/SomeForm.tsx`
  - `SomeForm/schema.ts`
  - `SomeForm/default.ts`
- Form components **MUST** expose callback props for submit outcomes:
  - `onSuccess`
  - `onError`
- Parent/container components **MUST NOT** own large inline form markup when a dedicated form component exists.
- The React Hook Form `Form` provider/wrapper **MUST** stay inside the custom form component (`SomeForm.tsx`), not in the parent/container.
- Keep schema concerns in `schema.ts`:
  - field constraints
  - transforms/refinements
  - type inference used by the form
- Keep form default values in `default.ts`:
  - initial form values
  - reusable defaults for reset flows
- Keep UI and submit orchestration in `SomeForm.tsx`.

---

## React Query Mutation Architecture (Either-With-Rule)

- You may use either mutation path below, but the decision **MUST** follow these rules.

### Path A: Server Action / Server-Only Mutation Function

- Use when mutation is internal to the Next.js app boundary.
- Use when direct server invocation is available and no public HTTP contract is needed.
- Keep auth/authorization checks and domain-side effects in server code.

### Path B: API Route Mutation

- Use when a stable HTTP boundary is required.
- Use when mutation is consumed across app boundaries or external clients.
- Keep auth/authorization checks and domain-side effects in route/server layers.

### Shared Rules for Both Paths

- Client form components **MUST NOT** implement domain mutation business logic.
- Client `useMutation` code should stay thin:
  - call the server mutation target
  - handle loading/disabled UX
  - trigger query invalidation/refetch
  - trigger toast feedback

---

## Submission Lifecycle Requirements

- On submit start:
  - set pending state from mutation
  - disable submit button and mutation-sensitive controls
  - optionally show spinner/progress indicator
- On submit success:
  - show success toast
  - reset or keep form state based on UX requirements
  - invalidate relevant query keys
- On submit error:
  - show error toast
  - preserve user input unless reset is explicitly required
  - surface field errors when validation mapping is available

---

## Error and Toast Handling Rules

- **MUST** handle three error classes:
  - client-side validation errors (Zod + React Hook Form)
  - expected server/domain errors (known business failures)
  - unknown/system errors (fallback message)
- **MUST** provide a user-safe fallback error toast for unexpected failures.
- **SHOULD** normalize error messages so users see consistent language.
- **SHOULD** avoid leaking internal error details to UI toasts.

---

## Example Skeleton (Reference)

- `schema.ts`: Zod schema + inferred types.
- `default.ts`: typed default form values.
- `SomeForm.tsx`:
  - `useForm` with Zod resolver
  - `defaultValues` sourced from `default.ts`
  - `useMutation` pointing to server mutation target
  - accepts `onSuccess` and `onError` callbacks from parent
  - submit button disabled while pending
  - toast on success/error
  - query invalidation on success

---

## Implementer and Agent Checklist (Pre-PR)

- [ ] Uses React Hook Form (no custom ad-hoc form state for core submit flow).
- [ ] Uses React Hook Form `Form` + `Controller` pattern (does not use `register` style).
- [ ] Uses colocated Zod schema at `SomeForm/schema.ts`.
- [ ] Uses colocated default values at `SomeForm/default.ts`.
- [ ] Uses React Query `useMutation` for writes.
- [ ] Form component accepts `onSuccess` and `onError` callback props.
- [ ] Parent/container does not hold large inline form markup; RHF `Form` wrapper stays in form component.
- [ ] Mutation business logic is server-side (server action/server-only/API route), not client-side.
- [ ] Submit controls have pending loading and disabled states.
- [ ] Double-submit is prevented while mutation is pending.
- [ ] Success and error toasts are both implemented.
- [ ] Field-level validation errors are rendered where relevant.
- [ ] Uses app-local `components/ui` fields first.
- [ ] Any native fallback field includes exact comment:
  - `TODO: please create field for this component`

---
