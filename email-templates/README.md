# Email Templates

Shared / cross-app auth email HTML drafts. Humans paste into **Supabase Dashboard →
Authentication → Emails → Templates**. Supabase renders Go-template variables and relays
delivery through **Resend** (custom SMTP). Nothing in `apps/` imports these files at runtime.

## Canonical coverage matrix

**Which of the 13 slots exist for client vs admin — including every MISSING checkbox — lives
only in [`docs/email-templates.md`](../docs/email-templates.md).** Do not duplicate that list
here. Spec: [`openspec/specs/auth-email/spec.md`](../openspec/specs/auth-email/spec.md).

| Kind | Path |
|------|------|
| App-specific (audience branch) | `apps/<app>/src/email-templates/<name>.html` |
| Shared / cross-app (this folder) | `email-templates/<provider>/<name>.html` |

One Supabase project → one deployed body per slot. Per-app files are composed (Go `{{ if }}`)
at paste time — see the branch-compose section in the matrix doc.

## This folder only

- `supabase/magic-link-otp.html` — OTP-first Magic link draft (`{{ .Token }}` prominent;
  `{{ .ConfirmationURL }}` as fallback). Suggested subject: `Your ROTRA Admin one-time code`.
- Admin also keeps `apps/admin/src/email-templates/magic-link.html` for the same slot; which
  body is pasted in the dashboard is not recorded in-repo (known gap in the OpenSpec).

## Notes

- Inline CSS + table layout only (no Tailwind / design tokens / JSX).
- Merging an HTML edit does **not** change delivered mail until someone pastes it into the
  dashboard.
- Adding or removing a template file REQUIRES flipping its checkbox in
  `docs/email-templates.md` in the same PR.
