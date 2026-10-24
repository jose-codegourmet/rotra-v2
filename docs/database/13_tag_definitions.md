# 13 — `tag_definitions`

## Table

```sql
CREATE TYPE tag_assignable_by_enum AS ENUM ('any_admin', 'super_admin_only');

CREATE TABLE tag_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  label           text NOT NULL,
  description     text,
  is_active       bool NOT NULL DEFAULT true,
  assignable_by   tag_assignable_by_enum NOT NULL DEFAULT 'any_admin',
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tag_definitions_active ON tag_definitions(is_active);
```

## Seed

```sql
INSERT INTO tag_definitions (slug, label, description, assignable_by)
VALUES (
  'tester-login-as-guest',
  'Tester Login As Guest',
  'Grants access to the /login-tester path on the client app.',
  'any_admin'
);
```

## RLS

Admin-only writes; reads for authenticated admins via service layer / API.

## Prisma

`TagDefinition` in `packages/db/prisma/models_tag_definitions.prisma`.

## Related

- [10_tag_definitions.md](../business_logic/admin_app/10_tag_definitions.md)
