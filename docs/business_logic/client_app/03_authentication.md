# 03 — Authentication

## Overview

Authentication for **players** is handled via **Facebook Login** (Supabase OAuth) and **Email Invitation** (then Facebook). Facebook is the identity anchor for player verification. **Platform admins** additionally use **email + password** on the Admin app and may use a gated **`/login-admin`** path on the client app (see Path C below); that does not replace the player verification model for normal accounts.

New users are **unverified by default** upon first sign-in. Verified status is a composite of three independently tracked conditions and unlocks full platform access.

---

## 03.1 Sign-In / Registration Paths

### Path A — Facebook Login (direct)

| Property | Value |
|---|---|
| Provider | Facebook (Meta) via Supabase Auth |
| Protocol | OAuth 2.0 |
| Scopes requested | `public_profile` (name, profile photo); `email` (optional, for linking) |
| Trigger | User taps "Continue with Facebook" on the login screen |

**Flow:**

```
1. User taps "Continue with Facebook"
2. Supabase initiates Facebook OAuth consent screen
3. User grants permission
4. Supabase receives Facebook access token and exchanges it for user profile (ID, name, photo)
5. Supabase checks auth.users for an existing record:
   a. NEW user → auth.users row created; handle_new_user() trigger fires; profiles row seeded
              → Session issued; redirect to /onboarding (wizard)
   b. EXISTING user → session issued; redirect to /home
6. Returning user who has not completed onboarding → redirected to /onboarding on every app open
```

---

### Path B — Email Invitation

| Property | Value |
|---|---|
| Trigger | An admin or club owner sends a tokenized invite to a target email address |
| Token TTL | 7 days from issue |
| Result | Recipient's email is pre-linked to their account upon Facebook login |

**Flow:**

```
1. Inviter (admin or club owner) issues an invitation to an email address
   → An email_invitations row is created with status = 'pending'
   → A tokenized invite link is emailed to the recipient
2. Recipient clicks the link
   → App validates the invite token (must be pending and not expired)
   → Recipient is shown a landing page with a "Connect with Facebook" prompt
3. Recipient taps "Continue with Facebook"
   → Supabase Facebook OAuth runs (same as Path A)
4. On Facebook auth success:
   a. NEW user → profiles row created; invite email populated into profiles.email
   b. EXISTING user → invite email linked to their existing profiles.email (if not already set)
   → email_invitations row updated: status = 'accepted', accepted_by = profile.id
5. Supabase sends an email verification link to the linked email address
6. Recipient clicks the verification link in that email
   → profiles.email_verified = true; profiles.email_verified_at = now()
7. Redirect to /onboarding (if not completed) or /home
```

**Notes:**
- If the invite token has expired, the user sees an error screen with a prompt to request a new invite.
- A user who already has a linked + verified email cannot have it replaced by a new invitation unless their current email is unverified.
- The inviter is recorded in `email_invitations.invited_by` for audit purposes.

---

### Path C — Admin sign-in (client app)

| Property | Value |
|---|---|
| Route | `/login-admin` on the client app |
| Preconditions | User must be an **active** platform admin (`profiles.admin_role` set, `profiles.admin_is_active = true`), provisioned via the Admin app invite flow |
| Credentials | Shared **access password** (env `CLIENT_ADMIN_LOGIN_GATE_PASSWORD`) then **email + password** (Supabase) |

**Flow:**

```
1. User opens /login-admin (URL not linked from player /login)
2. User submits access password → POST /api/auth/admin-gate
   → timing-safe compare to env; on success, short-lived httpOnly gate cookie
3. User submits email + password → POST /api/auth/admin-sign-in
   → Supabase signInWithPassword; then DB check admin_role + admin_is_active
   → If not an active admin: sign out, 403 NOT_ADMIN
   → If ok: clear gate cookie, session established, redirect /dashboard
```

**Onboarding:** Active admins skip the `/onboarding` redirect in the client protected layout so they can use the dashboard shell without completing the player wizard. They remain the same `profiles` row as in the Admin app (no duplicate identity).

**UI:** Sidebar / mobile drawer show a `Pill` for **Super admin** or **Admin**. See [`../../views/client_app/common/login-admin.md`](../../views/client_app/common/login-admin.md).

---

### Path D — Tester login (client app)

| Property | Value |
|---|---|
| Routes | `/login-tester` (returning sign-in), `/login-tester/auth/accept-invite` (invite link), `/set-password` (choose password after invite) |
| Preconditions | `profiles.is_tester_account = true` and profile tag `tester-login-as-guest` |
| Credentials | Email + password chosen on `/set-password` after first invite acceptance (optional: `tester_password` from invite email if template shows it) |

**First-time flow (invite email):**

```
1. Admin invites tester → Supabase email link:
   /login-tester/auth/accept-invite?token_hash=...&type=invite&next=/set-password
2. GET accept-invite → verifyOtp(type invite) → session cookies
   → Redirect to next (default /set-password). Invalid/expired token → /login-tester?error=...
3. Tester sets password on /set-password → POST /api/auth/set-password → updateUser({ password })
   → Redirect /home
```

**Returning flow:**

```
1. User opens /login-tester (URL not linked from player /login)
2. User submits email + password → POST /api/auth/tester-sign-in
   → Supabase signInWithPassword; then validateTesterSession
   → If not a valid tester: sign out, 403 NOT_TESTER
   → markTesterInvitationAccepted when pending invite not expired
   → Redirect /home
```

**Middleware:** `/login-tester` and `/login-tester/*` are public so the invite handler runs without a prior session. `/set-password` is **not** public; the tester must already have a session from step 2.

**Onboarding:** Testers skip `/onboarding` (same bypass pattern as active admins). See [22_tester_login.md](./22_tester_login.md).

---

## 03.2 Account Verification Model

New accounts are **unverified immediately after Facebook login**. An account becomes **verified** only when all three of the following conditions are simultaneously satisfied:

| # | Condition | How it's set |
|---|---|---|
| 1 | Linked Facebook account | `profiles.facebook_id IS NOT NULL` — set automatically on any Facebook login |
| 2 | Linked and verified email | `profiles.email IS NOT NULL AND profiles.email_verified = true` — set when email invitation accepted + email verification link clicked |
| 3 | Onboarding wizard completed | `profiles.onboarding_completed = true` — set when the wizard is finished |

The composite flag `profiles.is_verified` is a **generated column**:
```sql
is_verified BOOLEAN GENERATED ALWAYS AS (
  facebook_id IS NOT NULL
  AND email_verified
  AND onboarding_completed
) STORED
```

### Verified vs. Unverified Access

| Feature | Unverified | Verified |
|---|---|---|
| View the app / explore | Yes | Yes |
| Join a queue session | No | Yes |
| Submit match reviews | No | Yes |
| Appear on leaderboards | No | Yes |
| Create a club | No | Yes |
| Verified badge on profile | No | Yes |
| Onboarding wizard blocked | Shown on every open | Hidden (completed) |

Unverified users who try to take a restricted action are shown an inline prompt explaining which condition(s) remain unsatisfied.

---

## 03.3 Single Account Enforcement

- The identity key is the **Facebook user ID** (`profiles.facebook_id`), a globally unique numeric string from Meta.
- This check is performed server-side by Supabase on every OAuth login.
- One Facebook account = one ROTRA account. Duplicate creation is blocked at the DB level (`UNIQUE` constraint on `profiles.facebook_id`).
- If a second login attempt uses a Facebook account already in `profiles`, the existing session is returned — no duplicate is created.
- There is no "merge accounts" flow; accounts are permanently tied to their Facebook identity.

---

## 03.4 Profile Seeding on First Login

When `handle_new_user()` fires (first login via either path), the profile is seeded as follows:

| Field | Source | Editable after? |
|---|---|---|
| `id` | `auth.users.id` | No |
| `facebook_id` | `auth.users.raw_user_meta_data->>'provider_id'` | No |
| `name` | `auth.users.raw_user_meta_data->>'full_name'` | Yes (wizard Step 1) |
| `avatar_url` | `auth.users.raw_user_meta_data->>'avatar_url'` | Yes |
| `email` | `auth.users.email` (if present, e.g. from invitation path) | Yes |
| `onboarding_completed` | `false` | Becomes `true` on wizard completion |
| `email_verified` | `false` | Becomes `true` on email link click |
| `is_verified` | `false` (generated) | Becomes `true` once all 3 conditions met |

**After seeding:** All product UI and APIs that expose the player’s name or photo should use **`profiles.name`** and **`profiles.avatar_url`**. Facebook fields in Supabase Auth metadata are not updated when the player renames themselves in ROTRA; they are only relevant for the initial `handle_new_user()` insert.

---

## 03.5 Onboarding Redirect Guard

Any authenticated user with `onboarding_completed = false` is redirected to `/onboarding` on every app open, **except** an **active platform admin** signed in via Path C (`/login-admin`), who may use the protected client shell without completing the player onboarding wizard. The onboarding wizard remains non-closeable for everyone else. See [`20_onboarding.md`](./20_onboarding.md) for the full wizard specification.

| State | Redirect destination |
|---|---|
| Unauthenticated | `/login` |
| Authenticated + `onboarding_completed = false` (not an active admin) | `/onboarding` |
| Authenticated + active admin (`admin_role` + `admin_is_active`) | Protected app (no forced `/onboarding`) |
| Authenticated + tester (`is_tester_account`) | Protected app (no forced `/onboarding`); may use `/set-password` after invite before `/home` |
| Authenticated + `onboarding_completed = true` | `/home` |
| Unauthenticated + `/set-password` | `/login` (session required; typically reached only after invite `verifyOtp`) |

---

## 03.6 Session Management

| Property | Behaviour |
|---|---|
| Token type | JWT (managed by Supabase Auth) |
| Access token expiry | 1 hour |
| Refresh token expiry | 7 days |
| Refresh behaviour | Silent; user is not prompted |
| Logout | Clears local token; next login requires Facebook OAuth |
| Revocation | Server-side via Supabase Admin API on explicit logout or account suspension |

---

## 03.7 Security Considerations

| Concern | Handling |
|---|---|
| Token theft | Short access token + refresh rotation |
| Invite token abuse | Tokens expire after 7 days; single-use (accepted status blocks reuse) |
| Fake Facebook accounts | Not in scope for MVP; trust Meta's identity verification |
| Account suspension | Admin can flag an account; flagged accounts cannot log in |
| Email spoofing | Supabase email verification link required before `email_verified = true` |

---

## 03.8 Canonical Rules

| ID | Rule |
|----|------|
| RULE-001 | A ROTRA account must have a linked Facebook account. Facebook OAuth is always required, regardless of entry path. |
| RULE-002 | New accounts are unverified by default. No explicit "verify me" action is available; verification is the result of completing all three conditions. |
| RULE-003 | `is_verified` is a server-computed value. Clients must never compute or cache this flag independently. |
| RULE-004 | Invite tokens are single-use. Once `email_invitations.status = 'accepted'`, the token cannot be reused. |
| RULE-005 | Email verification requires Supabase email confirmation. Linking an email to a profile alone does not set `email_verified = true`. |
| RULE-006 | Any authenticated user with `onboarding_completed = false` must be redirected to `/onboarding` on every app open. See also RULE-050. |
| RULE-007 | Tester accounts must have `is_tester_account = true` and the `tester-login-as-guest` profile tag to sign in via Path D. |
| RULE-008 | Tester auth passwords are set on `/set-password` after invite acceptance (or from invite email if template shows `tester_password`). Admin must not set auth password at invite send time. ROTRA does not store plaintext passwords in Postgres. |
| RULE-009 | Tester accounts skip the player onboarding wizard. |
| RULE-010 | Tag slugs assigned to profiles must exist in `tag_definitions` and be active. |

---

## 03.9 Future Authentication (Phase 2+)

- Google Sign-In support (Supabase Google OAuth provider)
- Apple Sign-In support
- Multi-provider linking: a player could log in with Google or Facebook and reach the same account
- The identity model will be extended so that `facebook_id` becomes one of several linked provider identifiers
