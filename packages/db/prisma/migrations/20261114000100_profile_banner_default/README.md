# Admin picks the default profile banner

Ticket P10.6 (#820), epic #814. Decision [D-2026-11-13-03](../../../../../docs/mvp/decisions.md#d-2026-11-13-03)
(the default banner image is controlled in Admin). `migration.sql` is the `prisma migrate diff` output
for the new column (run against a disposable database migrated to the previous migration) followed by
the hand-written partial unique index and the Court seed.

## Why

Mock mode already lets Admin › Settings › Profile banners **Make default** another banner. Real mode
had no column, so it refused the button and every default fell back to Court (or the first shown
banner). This migration stores which banner is the default.

## What it adds (purely additive)

| Object | Rule |
|---|---|
| `profile_banners.is_default` | boolean, not null, default false |
| `profile_banners_one_default` | partial unique index on `(is_default) WHERE is_default`: at most one default row |
| Seed | `court` is marked default while it is shown and not deleted; otherwise no row is marked and reads keep the old fallback (the first shown banner) until Admin picks one |

Nothing is dropped, renamed or backfilled beyond the seed update. No CHECK or trigger keeps the
default shown and not deleted: that is a server rule, like the 2-shown rule.

## How the services use it

- `readShownProfileBanners` carries `isDefault`, so `resolveProfileBanner` picks the Admin default for
  every player with no pick, every guest and unclaimed profile (Queue saved players, the public
  session page), and the club cards (`/api/profile-banners/shown`, now served by all three apps).
- `setDefaultProfileBanner` (`POST /api/profile-banners/[id]/default`, Admin): under the
  `profile_banners` advisory lock, refuses a hidden banner (“Show this banner before making it the
  default.”), clears the old default and sets the new one in one transaction, writes
  `profile_banner.default_set` with `{ number, previousId, previousNumber }`, and returns
  `{ banner, previousId }` for Undo. The same banner as now changes nothing.
- `setProfileBannerShown` (hide) and `deleteProfileBanner` refuse the default first (“This is the
  default banner. Make another banner the default first.”), before the 2-shown rule.

## Verification (2026-11-14)

Local disposable PostgreSQL 16 (`rotra_disposable` on 127.0.0.1, `scripts/disposable-db.sh all`):
28 migrations applied, no drift between the database and the Prisma schema, 182 check constraints,
1 exclusion constraint, 28 triggers, 24 partial/expression indexes, 0 tables granted to
anon/authenticated; 72 integrity checks passed, 0 failed, including “second default banner”
(rejected by `profile_banners_one_default`) and “default banner moved in one transaction” (accepted).
After the rebuild only `court` has `is_default`. Not applied to the shared database.
