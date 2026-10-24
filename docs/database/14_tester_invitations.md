# 14 — `tester_invitations`

## Table

```sql
CREATE TABLE tester_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status      invitation_status_enum NOT NULL DEFAULT 'pending',
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tester_invitations_profile ON tester_invitations(profile_id);
CREATE INDEX idx_tester_invitations_status ON tester_invitations(status);
```

## Status lifecycle

| Status | Meaning |
|--------|---------|
| `pending` | Invite sent; not yet accepted |
| `accepted` | Tester signed in via `/login-tester` |
| `revoked` | Admin revoked pending invite |
| `expired` | Pending past `expires_at` (directory UI) |

## Relation to profiles

- `profiles.is_tester_account = true` for tester accounts.
- `profiles.facebook_id` nullable when `is_tester_account` (see `chk_identity_source`).

## Prisma

`TesterInvitation` on `Profile` in `models_profile.prisma`.

## Related

- [11_tester_management.md](../business_logic/admin_app/11_tester_management.md)
