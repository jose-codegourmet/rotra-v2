#!/usr/bin/env bash
# Rebuilds, seeds and checks a DISPOSABLE local PostgreSQL database (F07.19).
#
#   ROTRA_DISPOSABLE_DB_URL=postgresql://postgres@127.0.0.1:55432/rotra_disposable \
#   ROTRA_DISPOSABLE_CONFIRM=rotra_disposable \
#     scripts/disposable-db.sh rebuild|seed|check|all
#
# Safeguards: refuses unless the URL host is localhost/127.0.0.1/::1, the database name starts with
# `rotra_disposable`, ROTRA_DISPOSABLE_CONFIRM repeats that exact name, and the URL is not the same as
# DATABASE_URL or DIRECT_URL. It never reads .env. `rebuild` drops and recreates the database.
set -euo pipefail

cd "$(dirname "$0")/.."
url="${ROTRA_DISPOSABLE_DB_URL:-}"
[[ -n "$url" ]] || { echo "Set ROTRA_DISPOSABLE_DB_URL." >&2; exit 2; }

rest="${url#*://}"; rest="${rest#*@}"
host="${rest%%[:/]*}"; host="${host#[}"; host="${host%]}"
db="${rest#*/}"; db="${db%%\?*}"
admin_url="${url%/*}/postgres"

case "$host" in localhost|127.0.0.1|::1) ;; *) echo "Refusing: host '$host' is not local." >&2; exit 2 ;; esac
[[ "$db" == rotra_disposable* ]] || { echo "Refusing: database '$db' must start with rotra_disposable." >&2; exit 2; }
[[ "${ROTRA_DISPOSABLE_CONFIRM:-}" == "$db" ]] || { echo "Refusing: set ROTRA_DISPOSABLE_CONFIRM=$db." >&2; exit 2; }
for shared in "${DATABASE_URL:-}" "${DIRECT_URL:-}"; do
  [[ -z "$shared" || "$shared" != "$url" ]] || { echo "Refusing: URL equals an app connection." >&2; exit 2; }
done

psql_q() { psql "$1" -v ON_ERROR_STOP=1 -q -P pager=off "${@:2}"; }

rebuild() {
  echo "Rebuilding $db on $host"
  psql_q "$admin_url" -c "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)" -c "CREATE DATABASE \"$db\""
  # Stand-ins for Supabase-managed roles, so the REVOKEs in the migrations apply. Cluster-wide.
  psql_q "$admin_url" -c "DO \$\$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END \$\$"
  DIRECT_URL="$url" pnpm exec prisma migrate deploy
  echo "Drift between the migrated database and the Prisma schema (expected: none):"
  DIRECT_URL="$url" pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code \
    && echo "No drift." || { echo "Drift found (see above)." >&2; exit 1; }
  echo "SQL-only objects present after migration:"
  psql_q "$url" -c "
    SELECT 'check constraints' AS kind, count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'c'
    UNION ALL SELECT 'exclusion constraints', count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'x'
    UNION ALL SELECT 'triggers', count(*) FROM pg_trigger t JOIN pg_class r ON r.oid = t.tgrelid JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
    UNION ALL SELECT 'partial/expression indexes', count(*) FROM pg_index i JOIN pg_class r ON r.oid = i.indrelid JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND (i.indpred IS NOT NULL OR i.indexprs IS NOT NULL)
    UNION ALL SELECT 'tables granted to anon/authenticated', count(*) FROM information_schema.role_table_grants
      WHERE grantee IN ('anon', 'authenticated') AND table_schema = 'public'"
}

seed() { echo "Seeding fictional fixtures"; psql_q "$url" -f prisma/fixtures/fictional.sql; }
check() { echo "Running integrity checks"; psql_q "$url" -f prisma/fixtures/checks.sql; }

case "${1:-}" in
  rebuild) rebuild ;;
  seed) seed ;;
  check) check ;;
  all) rebuild; seed; check ;;
  *) echo "Usage: scripts/disposable-db.sh rebuild|seed|check|all" >&2; exit 2 ;;
esac
