# Email templates — coverage matrix

> **Canonical checklist.** Agents: read this before authoring or assuming an auth email
> template exists. Do not copy these checkboxes into other files — link here instead.
>
> Spec: [`openspec/specs/auth-email/spec.md`](../openspec/specs/auth-email/spec.md) ·
> Agent entry: [`AGENTS.md`](../AGENTS.md) §5 Auth email

## Legend

| Mark | Meaning |
|------|---------|
| `[x]` | Committed HTML **exists** at the listed path |
| `[ ]` | **MISSING** — needs authoring |

Checkbox state tracks the **repo file**, not whether the Supabase dashboard slot has been
pasted. A checked box still requires a human paste into **Supabase Dashboard → Authentication
→ Emails → Templates** before delivery changes.

Security notification emails only send when the matching notification is **enabled** at the
project level in the Supabase dashboard.

## Coverage summary

| App | Authored | Required | Status |
|-----|----------|----------|--------|
| Admin (`apps/admin`) | 3 | 13 | 3/13 |
| Client (`apps/client`) | 0 | 13 | 0/13 |
| **Overall** | **3** | **26** | **3/26** |

Last verified against the tree: **2026-08-30**.

## Filenames (kebab-case)

| Dashboard name | Config key | Filename |
|----------------|------------|----------|
| Confirm sign up | `confirmation` | `confirm-signup.html` |
| Invite user | `invite` | `invite-user.html` |
| Magic link or OTP | `magic_link` | `magic-link.html` |
| Change email address | `email_change` | `change-email-address.html` |
| Reset password | `recovery` | `reset-password.html` |
| Reauthentication | `reauthentication` | `reauthentication.html` |
| Password changed | `notification.password_changed` | `password-changed.html` |
| Email address changed | `notification.email_changed` | `email-address-changed.html` |
| Phone number changed | `notification.phone_changed` | `phone-number-changed.html` |
| Sign-in method linked | `notification.identity_linked` | `sign-in-method-linked.html` |
| Sign-in method removed | `notification.identity_unlinked` | `sign-in-method-removed.html` |
| MFA / Verification method added | `notification.mfa_factor_enrolled` | `mfa-method-added.html` |
| MFA / Verification method removed | `notification.mfa_factor_unenrolled` | `mfa-method-removed.html` |

Path pattern: `apps/<app>/src/email-templates/<filename>`.

---

## Admin (`apps/admin/src/email-templates/`)

### Authentication emails

- [ ] Confirm sign up — `confirmation` — `apps/admin/src/email-templates/confirm-signup.html`
- [x] Invite user — `invite` — `apps/admin/src/email-templates/invite-user.html`
- [x] Magic link or OTP — `magic_link` — `apps/admin/src/email-templates/magic-link.html`
- [ ] Change email address — `email_change` — `apps/admin/src/email-templates/change-email-address.html`
- [x] Reset password — `recovery` — `apps/admin/src/email-templates/reset-password.html`
- [ ] Reauthentication — `reauthentication` — `apps/admin/src/email-templates/reauthentication.html`

### Security notification emails

- [ ] Password changed — `notification.password_changed` — `apps/admin/src/email-templates/password-changed.html`
- [ ] Email address changed — `notification.email_changed` — `apps/admin/src/email-templates/email-address-changed.html`
- [ ] Phone number changed — `notification.phone_changed` — `apps/admin/src/email-templates/phone-number-changed.html`
- [ ] Sign-in method linked — `notification.identity_linked` — `apps/admin/src/email-templates/sign-in-method-linked.html`
- [ ] Sign-in method removed — `notification.identity_unlinked` — `apps/admin/src/email-templates/sign-in-method-removed.html`
- [ ] MFA method added — `notification.mfa_factor_enrolled` — `apps/admin/src/email-templates/mfa-method-added.html`
- [ ] MFA method removed — `notification.mfa_factor_unenrolled` — `apps/admin/src/email-templates/mfa-method-removed.html`

---

## Client (`apps/client/src/email-templates/`)

> Folder does not exist yet. Every row below is MISSING until HTML is committed and the box
> is flipped in the same PR.

### Authentication emails

- [ ] Confirm sign up — `confirmation` — `apps/client/src/email-templates/confirm-signup.html`
- [ ] Invite user — `invite` — `apps/client/src/email-templates/invite-user.html`
- [ ] Magic link or OTP — `magic_link` — `apps/client/src/email-templates/magic-link.html`
- [ ] Change email address — `email_change` — `apps/client/src/email-templates/change-email-address.html`
- [ ] Reset password — `recovery` — `apps/client/src/email-templates/reset-password.html`
- [ ] Reauthentication — `reauthentication` — `apps/client/src/email-templates/reauthentication.html`

### Security notification emails

- [ ] Password changed — `notification.password_changed` — `apps/client/src/email-templates/password-changed.html`
- [ ] Email address changed — `notification.email_changed` — `apps/client/src/email-templates/email-address-changed.html`
- [ ] Phone number changed — `notification.phone_changed` — `apps/client/src/email-templates/phone-number-changed.html`
- [ ] Sign-in method linked — `notification.identity_linked` — `apps/client/src/email-templates/sign-in-method-linked.html`
- [ ] Sign-in method removed — `notification.identity_unlinked` — `apps/client/src/email-templates/sign-in-method-removed.html`
- [ ] MFA method added — `notification.mfa_factor_enrolled` — `apps/client/src/email-templates/mfa-method-added.html`
- [ ] MFA method removed — `notification.mfa_factor_unenrolled` — `apps/client/src/email-templates/mfa-method-removed.html`

---

## Branch-compose model

ROTRA uses **one** Supabase project. That project exposes **exactly one** HTML body per slot
(13 slots total), not one per app. Per-app files are **audience-specific source branches**.
At paste time, a human composes them (typically with Go `{{ if }}` / `{{ else }}` on
`{{ .Data }}` or similar) into the single deployed body for that slot.

```
apps/client/src/email-templates/<slot>.html  ──┐
                                               ├──► composed body ──paste──► Supabase slot ──SMTP──► Resend ──► inbox
apps/admin/src/email-templates/<slot>.html   ──┘
```

Shared drafts may also live under root `email-templates/<provider>/` (e.g.
`email-templates/supabase/magic-link-otp.html`). When both shared and app-specific sources
exist for a slot, the app-specific file is the audience branch of record for that app.

## Variables

### Always available (most auth templates)

`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`,
`{{ .RedirectTo }}`, `{{ .Data }}`, `{{ .Email }}`

Also used in-repo: `{{ index .UserMetadata "<key>" }}` (e.g. tester invite metadata).

### Slot-scoped (wrong slot → empty render)

| Variable | Slot(s) only |
|----------|--------------|
| `{{ .NewEmail }}` | Change email address |
| `{{ .OldEmail }}` | Email address changed |
| `{{ .Phone }}`, `{{ .OldPhone }}` | Phone number changed |
| `{{ .Provider }}` | Sign-in method linked, Sign-in method removed |
| `{{ .FactorType }}` | MFA method added, MFA method removed |

## Maintenance rule

Adding or removing an `*/email-templates/*.html` file **REQUIRES** flipping the matching
checkbox (and updating the coverage summary counts) in **this file in the same PR**. Agents
must not leave the matrix stale.

Also: merging HTML does not change delivered mail until someone pastes it into the Supabase
dashboard — see `AGENTS.md` §7 trap 7 and `openspec/specs/auth-email/spec.md`.
