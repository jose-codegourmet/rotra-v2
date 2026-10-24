# Tasks

## Repository implementation

- [x] Restore the applied email-identity migration with the live checksum.
- [x] Add an unapplied follow-up migration for `on_auth_user_created`.
- [x] Add universal sign-up, sign-in, and forgot-password APIs.
- [x] Add generic invite and password-recovery callbacks.
- [x] Add `/login`, `/sign-up`, `/forgot-password`, and reset/invite password UI.
- [x] Derive additive roles from existing profile columns and remove synthetic Facebook IDs.
- [x] Remove specialized client tester/admin login implementation and add compatibility redirects.
- [x] Allow authenticated email/password accounts to change their password in settings.
- [x] Preserve dormant Facebook OAuth code without exposing it from `/login`.
- [x] Run the four form-engineering audits.
- [x] Run client lint and type-check.

## Deployment / manual follow-up

- [ ] Apply `20260830121000_install_auth_user_profile_trigger` in the target environment.
- [ ] Disable email confirmation for the immediate-session sign-up flow, or intentionally retain the implemented confirmation state.
- [ ] Allow the client `/auth/reset-callback` URL in Supabase Auth URL configuration.
- [ ] Configure the recovery email template to link to `/auth/reset-callback` with `token_hash` and `type=recovery` (the code fallback remains supported).
- [ ] Run end-to-end sign-up, universal role login, invite, recovery, and password-change checks against the configured Supabase project.
